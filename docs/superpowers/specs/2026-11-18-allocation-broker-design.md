# Allocation, fleet-owner offers and broker — design

Tickets ENR-027, 028, 032, 033. Binding rule (PRD section 4): brokers do not bid on customer loads. They receive allocations from transporters and place them with connected fleet owners or transporters. Migration `0014_allocations` (on `enroute_int`). All money in paise.

## Model in one paragraph

An accepted award (Ad Hoc or contract indent) already has N trips (`createTripsForAward`, seq 1..N, `executor_company_id` = the transporter). Trips are the unit of allocation. An **allocation** is an offer of Q of those trips from company A to company B at a rate per truck. The trips offered are recorded in `allocation_trips`. A partial unique index `(trip_id, depth) WHERE active` means one trip is in at most one live offer per level, so offered quantity can never exceed N, even under concurrent requests. Accepting sets `trips.executor_company_id` to the recipient, who then assigns its own vehicles and drivers with the existing `PATCH /trips/:id/assign`. Own-fleet trucks need no row: a trip with no live offer stays with the company that holds it.

## Tables (schema in `features/allocation/schemas/allocation.Schema.js`)

- `allocations`: `award_id, load_id, parent_allocation_id (depth 2 only), depth (1|2), from_company_id, to_company_id, to_company_type, quantity, rate_per_truck_paise, status (offered|accepted|declined|expired|withdrawn), note, respond_by, responded_at, responded_by_user_id, decision_note, created_by_user_id`.
- `allocation_trips`: `allocation_id, trip_id, depth, active, released_at`. Rows are never deleted; `active=false` on decline/expire/withdraw.
- `allocation_events`: insert-only history (`offered, accepted, declined, expired, withdrawn`, actor, note, data).
- `trips` gets two nullable columns: `executor_allocation_id`, `executor_rate_paise` (the rate the current executor agreed; earnings, ENR-035). Null while the transporter runs the trip.

## Rules (put in `allocation.rules.js`, unit-tested)

Constants in `allocation.constants.js`: `RESPOND_BY_HOURS = 24`, `MAX_DEPTH = 2`, `MAX_NOTE = 300`.

1. **Who can offer.** Depth 1: the award's transporter (`award.transporterCompanyId`), award `accepted`, load `accepted` or `in_execution`. Recipient company type must be `fleet_owner` or `broker`. Depth 2: a `broker` that holds trips through an **accepted depth-1 allocation to it** (`parent_allocation_id`). Recipient type `fleet_owner` or `transporter`. Nothing goes deeper: a depth-2 recipient cannot re-offer; a fleet owner at depth 1 cannot re-offer.
2. **Which trips.** Eligible = `executor_company_id = offerer`, `status = 'planned'`, `vehicle_id IS NULL`, and no live `allocation_trips` row at the new depth. The server takes the lowest `seq_no` eligible trips. Quantity 1..eligible count, else 409 `Only N trucks are free to offer`. Depth 2 only draws from trips of the parent allocation.
3. **Concurrency.** Every allocation write runs in one transaction that first locks the award row (`SELECT ... FROM awards WHERE id=$1 FOR UPDATE`), then locks the candidate trips `FOR UPDATE`. The unique index is the backstop (a violation maps to 409).
4. **Connection.** Offerer and recipient must have an `accepted` row in `company_connections` and neither side blocked. Recipient must be an approved, active company. Else 422 `Not connected to this company`.
5. **Rate.** `ratePerTruckPaise` integer > 0 (required), independent of the customer rate. Not capped by the rate the broker received (a broker may take a loss; the UI warns).
6. **Respond-by.** `respond_by = now + RESPOND_BY_HOURS` unless the offerer sends `respondByHours` (1..72). Must not pass the trips' `expected_placement_at` (clamp, not error).
7. **Answer.** Only users of `to_company_id` with `offers.respond`. `accept` and `decline` need status `offered` and `respond_by` in the future; else 409. Locks the allocation row `FOR UPDATE`; a repeated answer returns 409 (never allocates twice).
8. **Accept.** In one transaction: allocation `accepted`; for each active trip of the allocation, if still `planned` and unassigned and still held by `from_company_id`: set `executor_company_id = to_company_id`, `executor_allocation_id`, `executor_rate_paise = rate`; add a `trip_events` row `type 'executor_changed'` (from/to company names in `data`). If any trip no longer qualifies (cancelled), that trip is released and `quantity` stays as offered; response includes `acceptedCount`.
9. **Decline / expire / withdraw.** Allocation takes the new status, `allocation_trips.active=false, released_at=now`. Trips never changed hands, so quantity is back with the offerer to reallocate (to own fleet or another offer). Withdraw: offerer only, status `offered` only. Expiry: clock job every 60 s, `status='offered' AND respond_by < now`, locks `FOR UPDATE SKIP LOCKED`, notifies offerer.
10. **After accept it is final in v1.** No withdrawing an accepted allocation; the executor cancels a trip through the existing trip cancel (the trip returns nowhere, the transporter sees it cancelled and the load recomputes as today). Load cancel or award revoke: all `offered` allocations of the award are withdrawn by the system in the same transaction.
11. **Accountability.** `trips.transporter_company_id` never changes. The original transporter sees every downstream trip and its executor company. Existing `findTrip` already lets it in.
12. **History.** Every state change inserts an `allocation_events` row and a `trip_events` row per trip affected (`allocated` on offer, `executor_changed` on accept, `allocation_released` on decline/expire/withdraw), plus a `load_events` row `allocation_offered|accepted|declined` on the load. Notify the other party after commit.

## Visibility matrix

| Who | Sees |
|---|---|
| Customer | Load, trips, executor company name per trip (vehicle, driver, status). Never allocations, rates or offers. |
| Original transporter | Everything: all its allocations (any depth) with status, quantity, recipient, executor per trip. Rate of its own offers. For depth 2 it sees quantity, status and company names but **not** the broker's rate (the broker's margin). |
| Broker | Allocations it received (with the transporter's rate to it) and the ones it placed (its rate to them), and the trips of both. Not the customer's rate. |
| Fleet owner / depth-2 transporter | Allocations addressed to it and the trips it accepted, with its own rate. Not the customer, not the offerer's other offers. |
| Platform admin | All, read-only. |

Rule for code: a company reads an allocation only if it is `from_company_id`, `to_company_id`, or the award's `transporter_company_id` (rate field removed when the viewer is the transporter and `depth = 2`). Anyone else gets 404. Customer-facing queries (`/loads/*`, customer trips) must never join `allocations`. `findTrip` / `listTrips` must also admit a company on an allocation of that trip: `EXISTS (SELECT 1 FROM allocation_trips at JOIN allocations a ON a.id = at.allocation_id WHERE at.trip_id = trips.id AND at.active AND a.status IN ('offered','accepted') AND a.from_company_id = :company)`. Fleet owners and depth-2 recipients are already admitted as `executor_company_id`.

Trip money: the `freight` trip charge is the customer rate. A trip whose executor is not the transporter must show that executor only `executor_rate_paise` as its freight, never the customer rate (trip service to redact). Earnings for an executor = `executor_rate_paise` + approved extras of completed trips.

## ALLOC-BACKEND

Mount `router.use('/allocations', ...companyApi, allocationRoutes)`. Gated by `subscriptionGate` for writes (GET passes). Company from the token; all ids checked against it. Errors: 404 for anything the company may not see.

Allocation object (rate shown only where the matrix allows):
`{ id, awardId, loadId, loadNumber, depth, parentAllocationId, from: {id,name}, to: {id,name,type}, quantity, acceptedCount?, ratePerTruckPaise|null, status, note, respondBy, respondedAt, decisionNote, trips: [{id, seqNo, status, vehicleNumber|null, executor:{id,name}}], createdAt }`

| Method and path | Permission | Body / query | Result |
|---|---|---|---|
| `GET /allocations/awards/:awardId` | `allocations.manage` or trip visibility | none | `{ awardId, loadId, totalTrucks, own, offered, accepted, free, allocations: [...] }`. `own` = trucks run by the offerer itself, `free` = eligible to offer now. For the viewing company's level only (broker: its received trucks) |
| `POST /allocations` | `allocations.manage` | `{ awardId, toCompanyId, quantity, ratePerTruckPaise, respondByHours?, note?, parentAllocationId? }` (`parentAllocationId` required for a broker, absent for the transporter) | 201 allocation. Errors 403 (not owner of the trucks / no permission), 409 (not enough free trucks, award or load not live), 422 (not connected, wrong recipient type, rate), 402 (subscription) |
| `POST /allocations/:id/withdraw` | `allocations.manage` | `{ note? }` | allocation. Offerer only, status `offered`, else 409 |
| `POST /allocations/:id/accept` | `offers.respond` | `{}` | allocation (+ `acceptedCount`). Recipient only, `offered`, not past `respond_by` |
| `POST /allocations/:id/decline` | `offers.respond` | `{ reason }` (1..300) | allocation |
| `GET /allocations/offers` | `offers.respond` | `?status=offered|accepted|declined|expired&cursor&limit` | `{ items, nextCursor }` addressed to my company (fleet owner and broker inbox) |
| `GET /allocations/placed` | `allocations.manage` | `?status&awardId&cursor&limit` | offers my company made (transporter and broker outbox) |
| `GET /allocations/:id` | party (matrix) | none | allocation + `events: [{type, at, actor, note}]` |
| `GET /allocations/partners` | `allocations.manage` | `?type=fleet_owner|broker|transporter` | connected, approved companies the viewer may offer to, limited to the types rule 1 allows for its level: `[{id,name,type,city}]` |

Add to existing endpoints (additive, needed by the UI; owners are Wave 2b/others): `GET /trips` and trip detail return `executor: {id,name}` and, for the executor and transporter, `allocationId`; `GET /trips?role=allocated` for a fleet owner or broker lists trips they run or placed. `assignTrip` already requires the executor, so no change.

Notifications (type, to): `allocation.offered` (recipient), `allocation.accepted|declined|expired|withdrawn` (offerer; for depth 2 also the award's transporter, no rate).

Tests (rules only, no DB): quantity cap (sum of offered <= free), depth rules per company type, recipient type allowed per depth, respond-by clamp, status machine (offered -> accepted|declined|expired|withdrawn only), rate redaction by viewer, visibility predicate.

## ALLOC-UI

Permission keys: `allocations.manage` (transporter, broker), `offers.respond` (fleet_owner, broker). Mirror both in frontend `permissions.js`. Add `STATUS` tones: `offered` (info), `accepted` (success), `declined`/`expired`/`withdrawn` (neutral or warning).

1. **Transporter, load detail (accepted award) `/transporter/bids/:id`: "Allocate trucks" panel.** Header chips: Total N, Own, Offered, Accepted, Free. Button "Offer trucks" opens a modal: partner picker (`GET /allocations/partners`, fleet owners and brokers), quantity stepper (max = `free`), rate per truck (rupees input, sent as paise; hint shows the customer rate is hidden from the partner), respond-by (default 24 h), note. Below: table of allocations with status chip, recipient, quantity, rate, respond-by countdown, Withdraw on `offered`. Declined/expired rows show "Returned to you" so the free count is obviously back. The rest "stays with your fleet" and the existing assign-trucks UI applies.
2. **Fleet owner, Loads page `/fleet-owner/loads` (replaces placeholder): offers inbox.** Grid from `GET /allocations/offers`: load number, lane, pickup date, trucks, rate per truck, offered by, respond-by countdown, status. Detail side panel with route, material, weight, pickup, and Accept / Decline (reason required). After accept, button "Assign trucks" goes to its Trips page where each of its trips is assigned with the existing assignment modal.
3. **Broker, Loads `/broker/loads`: "Received" and "Placed" tabs.** Received = same inbox as fleet owner. Accepted received rows expand to "Place with your network": same modal as transporter but `parentAllocationId` set, partners = fleet owners and transporters, max = trucks still free in that allocation, warning when rate > rate received. Placed tab = outbox from `GET /allocations/placed`. Broker Transporters and Fleet owners pages are the existing network pages filtered by type. No bid UI anywhere for a broker.
4. **Trips pages.** Transporter and broker trip lists add an Executor column (company name) and a filter "Placed with others". Customer trip lists show the executor company name only.
5. **States.** Empty (no partners connected: link to Network), loading skeleton, 409 "only N free, refreshed", expired offer disabled, read-only mode on 402.
6. **Accessibility/mobile.** Modal is keyboard-operable; tables collapse to cards on mobile (data-grid already does).

## Defaults I chose (client may change)

Respond-by 24 h (constant), one level of re-offer, transporter cannot offer to another transporter, accepted allocation is final, broker is free to price below what it received, transporter does not see the broker's re-offer rate, `free` = planned and unassigned trips only.
