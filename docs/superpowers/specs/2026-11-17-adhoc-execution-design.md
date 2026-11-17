# Ad Hoc execution: data model and API contract (Wave 2)

Binding for the three builders (LOADS-BACKEND, FLEET-BACKEND, TRIPS-BACKEND). Decisions come from PRD section 4. Migration: `backend/drizzle/0010_adhoc_execution.sql` (applied to `enroute_w2`). Schemas: `load/schemas/*`, `fleet/schemas/fleet.Schema.js`, `trip/schemas/trip.Schema.js`, `document/schemas/documents.Schema.js`. Constants: `load/load.constants.js`, `trip/trip.constants.js` (new). Money in this wave is **paise (bigint, JS number)**. Older load money columns (target_price, bids) stay in rupees; do not mix: convert at the edge.

## 1. Data model

### 1.1 loads (new columns, all in `load.Schema.js`)
| Column | Type | Meaning |
| --- | --- | --- |
| pickup_place_kind, drop_place_kind | varchar(10) | `door` or `godown` |
| pickup_is_oda, drop_is_oda | bool default false | out-of-delivery-area flags |
| distance_km | int | route distance, entered or computed by the builder |
| hazmat_class | varchar(2) | `1`..`9`, required when special_requirements has `hazmat` |
| un_number | varchar(8) | e.g. `UN1203`, required with hazmat |
| declared_value_paise | bigint | goods value |
| invoice_number, invoice_date | varchar(50), date | |
| package_count | int | PTL |
| package_dims | jsonb `[{count,lengthCm,widthCm,heightCm,weightKg?}]` | PTL cargo block |
| actual_weight_kg, volumetric_weight_kg, chargeable_weight_kg | numeric(10,2) | PTL. volumetric = sum(count*L*W*H)/5000; chargeable = max(actual, volumetric, 50). Computed by `load.rules.js`, never trusted from the client |
| stackable, handling | bool, varchar(20) | handling in `manual|forklift|crane|none` |
| free_time_loading_hours, free_time_unloading_hours | int default 24/24 | |
| detention_rate_paise_per_hour | bigint default 0 | charged after free time |
| labour_payable_by, freight_payable_by | varchar(12) default `consignor` | `consignor|consignee|transporter` |
| toll_included | bool default true | |

`price_basis` enum gains `per_kg` (PTL). `kind` stays `ad_hoc|contract`; `load_type` stays `FTL|PTL`. **load_status is unchanged**: the load is `in_execution` while trips run and becomes `completed` when every trip is `completed` or `cancelled` and at least one is `completed`.

### 1.2 awards (new columns)
`terms_snapshot jsonb` and `terms_accepted_at`. Written once in the accept transaction: `{ priceBasis, amount (rupees as bid), freeTimeLoadingHours, freeTimeUnloadingHours, detentionRatePaisePerHour, labourPayableBy, freightPayableBy, tollIncluded, loadType, chargeableWeightKg, vehicleCount }`. Trips and charges read terms from this snapshot, never from the live load.

### 1.3 documents (extended, reused)
`document_type` enum adds: `permit, fitness, puc, licence, eway_bill, weighbridge, invoice_copy, discrepancy_photo, closure_sheet` (rc, insurance, pod, lr existed). New columns `entity_type varchar(20)` (`vehicle|driver|trip|discrepancy|load`, null = company/user document) and `entity_id uuid`. Index on both. LR photo = POD (`pod` type, entity `trip`).

### 1.4 vehicles
id, owner_company_id, registration_number (varchar 20, **normalised**: upper case, `[A-Z0-9]` only; unique among non-deleted rows platform-wide), vehicle_type_id, capacity_tons, availability (`available|on_trip|maintenance|inactive`; `on_trip` is set only by the trip service), rc_number/rc_expiry, insurance_number/insurance_expiry, permit_number/permit_expiry, fitness_number/fitness_expiry, puc_expiry, is_active, timestamps (soft delete via deleted_at).

### 1.5 drivers
id, owner_company_id, name, phone (unique per company among non-deleted), licence_number, licence_expiry, availability (`available|on_trip|off_duty|inactive`), is_active, years_experience, timestamps. No login (PRD Q-18).

### 1.6 trips
id, load_id, award_id, seq_no (unique per load), transporter_company_id (award owner, paid), executor_company_id (moves the truck; equal to transporter until Wave 3 allocation), vehicle_id, driver_id, status, expected_placement_at, loaded_weight_kg, lr_number, eway_bill_number, eway_bill_valid_until, eta_at, delay_reason, pod_condition (`clean|remarks`), pod_remarks, cancel_reason, milestone timestamps (reported_at, loading_started_at, loaded_at, departed_at, reached_drop_at, unloading_started_at, delivered_at, completed_at, cancelled_at), auto_complete_at, auto_complete_warned_at. A DB check restricts `status` to the ten values.

### 1.7 trip_events
Insert-only history: trip_id, type (`status|note|delay|location|charge|document|discrepancy|auto_complete_warning`), from_status, to_status, actor_user_id (null = system), actor_company_id, note, location_text, data jsonb, created_at.

### 1.8 trip_charges
trip_id, kind (`freight|detention|labour|toll|other`), amount_paise (>0), description, status (`proposed|approved|rejected`), proposed_by_user_id/company_id, decided_by_user_id, decided_at, decision_note. The freight line is created `approved` at trip creation from the terms snapshot. Others are proposed by the executor, approved or rejected by the **customer** (consignor).

### 1.9 discrepancies
trip_id, kind (`shortage|damage`), quantity, unit (`packages|kg|tons`), note, raised_by user/company. Photos = documents (`discrepancy_photo`, entity `discrepancy`).

### 1.10 ratings
load_id, from_company_id, to_company_id, given_by_user_id, stars (check 1..5), comment. Unique (load, from, to). Customer rates the transporter; transporter rates the customer; only after the load is `completed`.

### 1.11 placement_misses
trip_id, load_id, transporter_company_id, missed_at, decision (`re_award|cancel`, null until the customer decides), decided_by_user_id, decided_at. One row per miss; the count per transporter is the reliability signal.

### 1.12 Permissions (`team.permissions.js`)
| Key | Company types | Presets (added) |
| --- | --- | --- |
| `trips.update` | transporter, fleet_owner, broker | Co-admin (all), Trip manager |
| `fleet.manage` | transporter, fleet_owner | Co-admin (all), Trip manager |

Owner holds all automatically. Bid manager unchanged (still `trips.assign`). The migration appended the keys to existing Co-admin and Trip manager roles. Customer actions use `loads.manage` (cancel, decide on misses, approve charges) and `loads.award` (confirm completion, re-award). Ratings need `loads.award` (customer) or `trips.update` (executor side). Reading (GET) needs no permission, only company scoping.

## 2. Trip status machine

`trip.constants.js` has `TRIP_TRANSITIONS`. Every change runs in one transaction: update trip, set milestone timestamp, insert `trip_events` row, update vehicle/driver availability, and recompute the load status.

| From | To | Who | Rule / side effect |
| --- | --- | --- | --- |
| planned | reported | executor, `trips.update` | needs vehicle + driver assigned; sets reported_at |
| reported | loading | executor | loading_started_at |
| loading | loaded | executor | needs loaded_weight_kg and lr_number; loaded_at; eway bill number optional here, required before in_transit when the load has declared value over Rs 50,000 |
| loaded | in_transit | executor | needs eta_at; departed_at |
| in_transit | delayed | executor | needs delay_reason (and new eta_at) |
| delayed | in_transit | executor | clears nothing, history keeps the reason |
| in_transit / delayed | reached_drop | executor | reached_drop_at |
| reached_drop | delivered | executor | needs a `pod` document (photo of signed LR) and pod_condition; unloading_started_at optional; sets delivered_at and auto_complete_at = delivered_at + 7 days |
| delivered | completed | customer (`loads.award`) or system | system when now >= auto_complete_at; customer may confirm any time; sets completed_at; frees vehicle/driver |
| planned..loaded | cancelled | executor (reason required) or customer (only while `planned`, reason required) | cancel_reason; frees vehicle/driver. Not allowed from in_transit onwards |

Anything else returns 409. Vehicle/driver become `on_trip` when the trip reaches `reported` (or at assignment, builder's choice, but be consistent) and `available` on completed/cancelled. A vehicle or driver may be on one active trip at a time (409 otherwise). Auto-complete warning: 24 h before auto_complete_at the clock inserts a `auto_complete_warning` event, notifies the customer and sets auto_complete_warned_at once. Placement miss: clock finds trips still `planned` with expected_placement_at + 60 min passed; inserts a `placement_misses` row once per trip, notifies the customer, event `placement_missed`. The customer then calls the decision endpoint.

## 3. LOADS-BACKEND

Builder owns `load.service.js`, `load.validation.js`, `load.rules.js` (+ tests), `award.service.js` accept path, controllers/routes of load. Extend existing endpoints; payloads use camelCase of the columns above.

- `POST /loads`, `PATCH /loads/:id` (existing): accept and validate all new load fields. Rules: `hazmatClass` + `unNumber` required when tag `hazmat`; `loadType='PTL'` requires `packageDims` (each count/L/W/H > 0) and `actualWeightKg`; server computes `volumetricWeightKg` and `chargeableWeightKg` and writes them; PTL forces `priceBasis='per_kg'`; FTL rejects `per_kg`. Defaults for terms come from `TERMS_DEFAULTS`; enums from `PLACE_KINDS`, `HANDLING_TYPES`, `PAYABLE_BY`. Money in the API for new fields is paise.
- `GET /loads/:id` and list rows return the new fields. Bidders may see `declaredValuePaise`; `targetPrice` stays hidden as before.
- Pure rule `chargeableWeight({ packageDims, actualWeightKg })` in `load.rules.js` returns `{ volumetricWeightKg, chargeableWeightKg }` using `PTL_DEFAULTS`; unit-tested.
- `POST /awards/:id/accept` (existing): in the same transaction write `terms_snapshot`, `terms_accepted_at`, then **create the trips** by calling `createTripsForAward(tx, { load, award })` exported from the TRIPS-BACKEND (`trip/services/trip.service.js`). Until that exists, the Loads builder stubs the call behind a feature check but must not create trips itself. Load goes `accepted` as today; it moves to `in_execution` when the first trip is `reported` (trip service does this).
- `PATCH /awards/:id/assignment` (legacy truck entry): keep working, but when trips exist it forwards to the trip assign endpoint (section 5); the builders agree this is deprecated.
- Customer re-award after a miss is the existing `POST /loads/:id/award` path; the trips builder calls the decision endpoint (section 5) which sets the load back to `closed` so award works again.

## 4. FLEET-BACKEND

New feature `backend/src/features/fleet/` (controllers, routes, services, validations, `fleet.rules.js` + tests). Mount at `/api/v1/fleet`. Company scoping: only `owner_company_id = user.companyId`, companies of type transporter or fleet_owner. Writes need `fleet.manage`; reads need any member.

`fleet.rules.js` exports `normaliseRegistration(raw)` (strip non-alphanumerics, upper case; reject unless 8..11 chars), `docStatus(expiry, today)` returning `valid|expiring|expired` (expiring = within 30 days), `isAssignable(vehicle|driver, today)` (active, available, no expired RC/insurance/permit/fitness or licence). Expired documents block assignment with 409 and a message naming the document.

| Method path | Body / query | Response |
| --- | --- | --- |
| GET `/fleet/vehicles` | `?q&availability&cursor&limit` | `{ items: Vehicle[], nextCursor }`; Vehicle includes `docStatus: { rc, insurance, permit, fitness, puc }` |
| POST `/fleet/vehicles` | `{ registrationNumber, vehicleTypeId, capacityTons, rcNumber, rcExpiry, insuranceNumber, insuranceExpiry, permitNumber?, permitExpiry?, fitnessNumber?, fitnessExpiry?, pucExpiry? }` | 201 Vehicle. 409 if the normalised number exists on the platform |
| GET `/fleet/vehicles/:id` | | Vehicle + `documents[]` (entity vehicle) |
| PATCH `/fleet/vehicles/:id` | any of the above + `availability` (`available|maintenance|inactive` only; not `on_trip`) | Vehicle. 409 while on a trip for availability changes |
| DELETE `/fleet/vehicles/:id` | | soft delete; 409 if on an active trip |
| POST `/fleet/vehicles/:id/documents` | `{ documentType, fileUrl }` (type in rc, insurance, permit, fitness, puc) | 201 document, entity_type `vehicle` |
| GET `/fleet/drivers`, POST, GET `:id`, PATCH `:id`, DELETE `:id` | `{ name, phone, licenceNumber, licenceExpiry, availability, yearsExperience }` | Driver. Phone normalised to digits, unique per company (409) |
| POST `/fleet/drivers/:id/documents` | `{ documentType: 'licence', fileUrl }` | 201 document |
| GET `/fleet/availability` | `?vehicleTypeId` | `{ vehicles: Vehicle[], drivers: Driver[] }` only assignable ones, for the assign picker |

Notifications: a daily clock job `fleet-expiry` (builder adds to the existing clock pattern) notifies the company 30 and 7 days before any expiry (type `fleet.expiry`).

## 5. TRIPS-BACKEND

New feature `backend/src/features/trip/` (controllers, routes, services, validations, `trip.rules.js` + tests, constants already added). Mount at `/api/v1/trips`. Scoping: a user sees a trip if `executor_company_id`, `transporter_company_id` or the load's `customer_company_id` equals their company. Executor/transporter writes need `trips.update` (assign needs `trips.assign` or `trips.update`); customer writes need `loads.manage` / `loads.award` as listed.

`trip.rules.js` (pure, tested): `canTransition(from, to)`, `actorsFor(to)`, `autoCompleteAt(deliveredAt)`, `isPlacementMissed(trip, now)`, `shouldWarnAutoComplete(trip, now)`, `detentionCharge({ arrivedAt, startedAt, freeHours, ratePaisePerHour })` (hours past free time, rounded up, times rate).

Exported for the Loads builder: `createTripsForAward(tx, { load, award })` creates `vehicle_count` trips (seq 1..n, status planned, executor = transporter, expected_placement_at = load pickup date + time-from) plus one approved `freight` charge each (award amount split per vehicle for per_vehicle; per_ton and per_kg lines computed from weight at delivery, builder documents the choice in code), writes a `trip_events` `created` row each.

| Method path | Body / query | Response |
| --- | --- | --- |
| GET `/trips` | `?status&loadId&role=executor\|customer&cursor&limit` | `{ items: TripRow[], nextCursor }` (TripRow: trip + load number, route, vehicle reg, driver name, last event) |
| GET `/trips/:id` | | `{ trip, load (public fields), vehicle, driver, events[], charges[], discrepancies[], documents[], rating? , placementMiss? }`. Prices visible only to the award owner and the customer |
| PATCH `/trips/:id/assign` | `{ vehicleId, driverId, expectedPlacementAt? }` | Trip. Vehicle and driver must belong to the executor company, be assignable (fleet rules) and not be on another active trip; allowed in planned only (reassign allowed while planned) |
| POST `/trips/:id/transition` | `{ to, note?, locationText?, loadedWeightKg?, lrNumber?, ewayBillNumber?, ewayBillValidUntil?, etaAt?, delayReason?, podCondition?, podRemarks?, cancelReason? }` | Trip. Validates the table in section 2; 409 on a bad transition, 422 on a missing required field |
| POST `/trips/:id/notes` | `{ note, locationText? }` | 201 event (manual tracking update, PRD Q-13) |
| POST `/trips/:id/documents` | `{ documentType: lr\|pod\|eway_bill\|weighbridge\|invoice_copy\|closure_sheet, fileUrl }` | 201 document, entity_type `trip` |
| POST `/trips/:id/charges` | `{ kind: detention\|labour\|toll\|other, amountPaise, description }` | 201 charge, status `proposed`. Executor only, not for cancelled trips. For `detention` the service may pre-fill from `detentionCharge()` using the award snapshot |
| POST `/trips/:id/charges/:chargeId/decision` | `{ decision: approved\|rejected, note? }` | Charge. Customer only (`loads.manage`) |
| POST `/trips/:id/discrepancies` | `{ kind, quantity, unit, note, photoUrls?: string[] }` | 201 discrepancy; photos stored as documents. Allowed from `reached_drop` on, by executor or customer |
| POST `/trips/:id/confirm` | `{ rating?: { stars, comment } }` | Trip `completed`. Customer only (`loads.award`), from `delivered` |
| POST `/trips/:id/cancel` | `{ reason }` | same as transition to cancelled with the actor rules in section 2 |
| POST `/trips/:id/placement-decision` | `{ decision: 're_award'\|'cancel', reason? }` | Customer only (`loads.manage`), needs an open placement_misses row. `re_award`: cancel the trip, load back to `closed`, previous award marked `declined`, so the customer picks the next ranked bid; `cancel`: cancel the load. Records decision on the miss row |
| POST `/loads/:loadId/ratings` | `{ stars, comment }` | 201. Rater is derived from the user's company (customer rates the award owner; executor side rates the customer). Load must be `completed`; 409 on a duplicate |
| GET `/transporters/:companyId/reliability` | | `{ placementMisses, completedTrips, avgStars, ratingCount }` for bid screens (customer-visible for companies in their network) |

Clock jobs (add to the existing clock service pattern, same interval): (1) auto-complete delivered trips past `auto_complete_at` (actor null, event type `status`, note `auto-completed`); (2) warn 24 h ahead; (3) placement-miss detection. After any trip reaches `completed` or `cancelled`, recompute the load: all trips done and at least one completed -> load `completed` (+ load event); first trip `reported` -> load `in_execution`.

Notifications (use the existing notification service): trip stage changes to the customer (`trip.status`), proposed charge to the customer (`trip.charge`), decision to the executor, auto-complete warning (`trip.autocomplete`), placement miss to the customer (`trip.placement_missed`), assignment to nobody (drivers have no login).

## 6. Out of scope for Wave 2
GPS tracking, driver app, invoicing and payment, broker/fleet-owner allocation of trips (executor_company_id exists for it), RFQ/contract trips.
