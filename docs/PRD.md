# EnrouteLogtek: product requirements and build plan

Written 17 Nov 2026 on branch `suman`. Sources: [ticket tracker](../tickets/README.md), [Ad Hoc journey](../tickets/adhoc-journey.md), [Ad Hoc build tickets](../tickets/adhoc-load.md), [team roles spec](superpowers/specs/2026-11-11-team-roles-design.md), [build map](arc/enroute-build-map.html), [old context](dbml/outher/PROJECT_CONTEXT.md).
Where the client has not answered a question, this file picks the default the docs already propose and records it in section 4. Every default lives in a constants file, so changing one later is a one-line change.

## 1. Product in one paragraph

A B2B road-freight platform for India. A **Customer** (shipper) buys transport two ways: an **Ad Hoc load** (one shipment, a short ranked bidding window) or a **Contract RFQ** (lanes and volumes over a period, quoted per lane). Invited **Transporters** bid. The customer awards, the transporter accepts. The transporter runs the work with its own trucks or hands parts to **Fleet owners** (and, through a **Broker**, to more capacity). Every truck becomes a **Trip**: placement, loading with LR and e-way bill, transit, delivery with POD, closure with charges. A **Platform admin** approves companies and subscription payments.

Chain of records: `RFQ / Load (requirement) → Bid (offer) → Award → Contract (agreed business) → Allocation (who executes) → Trip (one truck) → POD → Closure`.

## 2. Actors and what each one does

| Actor | Main jobs | Dashboard sections |
| --- | --- | --- |
| Customer | Post Ad Hoc loads and RFQs, invite transporters, award, follow trips, approve POD and charges | Overview, Network, Loads, RFQs, Contracts, Trips, Reports, Team, Settings |
| Transporter | Bid, accept awards, quote RFQs, manage fleet and drivers, assign trucks, run trips, allocate to fleet owners | Overview, Network, RFQs, Bids, Contracts, Fleet, Drivers, Trips, Reports, Team, Settings |
| Fleet owner | Accept or decline allocated work, assign own trucks and drivers, run trips, see earnings | Overview, Network, Loads, Vehicles, Drivers, Trips, Earnings, Reports, Team, Settings |
| Broker | Take allocated work from transporters and place it with connected fleet owners or transporters; follow trips | Overview, Network, Loads, Transporters, Fleet owners, Trips, Reports, Team, Settings |
| Platform admin | Approve or reject companies, review documents, approve subscription payments, manage plans and users | Companies, Users, Subscriptions, Plans, Admins |
| Company team member | Whatever their company role allows (permissions in `team.permissions.js`) | Same as their company |

## 3. Modules and their state

| # | Module | Today | Build in this plan |
| --- | --- | --- | --- |
| M1 | Auth, registration, login code | Built | Fix ENR-001 to 004 (security) |
| M2 | Platform admin: companies, users, admins | Built | Document review, plans, payment approval |
| M3 | Network | Built | Redesign only |
| M4 | Team and roles | Built, screens not browser-checked | Verify, add new permissions, redesign |
| M5 | Company settings, branches, documents | Placeholder | ENR-007, 008, 009 |
| M6 | Ad Hoc loads (create, bid, award, accept) | Built | Mode gate, FTL/PTL, commercial terms (AJ-01 to 14), race safety (ENR-015/016) |
| M7 | Fleet and drivers | Free-text truck only | ENR-024/025, AJ-15/16/19 |
| M8 | Trips and execution | Basic assign + manual complete | ENR-029/030/031, AJ-17 to 37 |
| M9 | Contract RFQs and contracts | Not started | ENR-018 to 023, 026 |
| M10 | Allocation, fleet-owner offers, broker | Not started | ENR-027/028/032/033 |
| M11 | Subscriptions and seats | Tables only | ENR-010/011/034 |
| M12 | Earnings, reports, dashboard metrics | Placeholders | ENR-035/036/037 |
| M13 | Notifications | In-app + best-effort email | Durable retry (ENR-017), execution notifications (AJ-39) |
| M14 | Design system and redesign | Ad hoc styles per page | Shared kit + data grid, every screen on it |

## 4. Decisions taken from the docs (client may change later)

| Q | Decision | Source |
| --- | --- | --- |
| Q1 Daily | "Daily" = an indent against a contract (M9), not a separate Ad Hoc mode | journey §0, build map |
| Q2 FTL / PTL | Both in v1: FTL priced per vehicle, PTL on chargeable weight per kg | journey §3 |
| Q3 Bid window | 12 h default, customer can change at publish | load.constants.js |
| Q4 Target price | Hidden from bidders | proposed |
| Q5 Invitees | Accepted network connections only | current code |
| Q6 Cancel after award | Allowed before transporter acceptance only; after that, through a trip cancellation with a reason | journey §13 |
| Q7 Acceptance | 24 h | current code |
| Q8 Price basis | Per vehicle default; per ton and per km kept; per kg for PTL | journey §3 |
| Q9 Truck types | Seeded master list stays; admin can edit | master.service.js |
| Q-10 PTL | Volumetric divisor 5000, minimum chargeable 50 kg | proposed |
| Q-11 Bid withdrawal | No withdrawal before close | proposed |
| Q-12 Placement missed | Customer decides each time: re-award to next ranked bid or cancel; the miss is recorded on the transporter | proposed |
| Q-13 Tracking | Manual status updates in v1 | proposed |
| Q-14 POD | Photo of the signed LR is enough | proposed |
| Q-15 GST | Transporter declares RCM or forward charge on the closure sheet | proposed |
| Q-16 Auto-complete | Yes, 7 days after last POD with a 24 h warning | proposed |
| Q-17 Rejected goods | Recorded as a discrepancy; settlement outside the platform in v1 | proposed |
| Q-18 Drivers | Company-managed records, no driver login in v1 | ENR-025 |
| Q-19 Free time | 24 h loading, 24 h unloading | proposed |
| Q-20 Labour | Payable by consignor by default, editable per load | proposed |
| Broker (ENR-032) | Brokers do not bid on customer loads. They receive allocations from transporters and place them with their connected fleet owners or transporters | build map: "brokers manage loads; bidding proposal withdrawn after reading the product document" |
| RFQ (ENR-018) | One RFQ = validity period + 1..n lanes (origin, destination, truck type, monthly volume, rate basis). Transporters quote per lane, may revise until close. Customer awards each lane to one transporter. Acceptance creates one contract per transporter with an immutable rate snapshot per lane. Indents draw against a lane's volume | journey "Next", build map |
| Contracts | Amend only by mutual consent (proposal + accept), each version kept; cancel with notice and reason; expire at validTo | ENR-023 |
| Plans (ENR-010) | No prices in code. Platform admin creates plans (name, monthly price, included seats, extra seat price). Company picks a plan, uploads payment proof, admin approves; approval sets dates and seats once. Grace 7 days after expiry, then read-only | PROJECT_CONTEXT subscriptions |
| Earnings | Agreed rate + approved extras of completed trips, per trip and per vehicle; shown as "earned", never "paid" | ENR-035 |

## 5. End-to-end flows that must work

1. **Onboard**: register (email code) → documents → pending → admin approves → login with code → change temp password if needed.
2. **Connect**: discover → request → accept.
3. **Ad Hoc FTL**: mode gate → FTL → 5-step wizard → publish → transporter bids (up to 5, sees own rank) → close → award → accept in 24 h → assign trucks and drivers → placement → loading (LR, e-way bill) → in transit → delivered with POD → charges approved → complete.
4. **Ad Hoc PTL**: same, priced per kg with chargeable weight, hub legs.
5. **Contract RFQ**: create with lanes → invite → quotes and revisions → compare board → award per lane → accept → contract → indent → trips.
6. **Allocation**: transporter splits accepted work: own fleet / fleet owner / broker → they accept or decline → their trucks become trips.
7. **Team**: add member with temp password → role → permissions apply → deactivate.
8. **Subscription**: pick plan → upload proof → admin approves → seats enforced on adding members.
9. **Failure branches**: no bids → expire; award declined or timed out → re-award; placement missed; discrepancy; cancellation with reason.
10. **Reports and metrics**: every number on Overview and Reports reconciles with its list.

## 6. Non-functional rules

- Server is the judge of every permission and company scope; hidden buttons only avoid failing clicks.
- Every state change is one transaction with a `load_events` / `team_events` style history row.
- Money in paise (integers); dates shown "Nov 17", never ISO.
- Every list: cursor pages, search, filters, loading skeleton, empty state with the action, error with retry.
- No new dependency without a line in this file saying why.

## 7. Design system (M14)

One look across the app, following the [cool-dashboard-ui](~/.claude/skills/cool-dashboard-ui) standard and the Enroute brand: dark page, tonal `rounded-3xl` panels, no borders or gradients, **one accent = Enroute gold**, four semantic tones, big light numbers, chips for status.

- `frontend/src/shared/ui/kit/`: Panel, Inset, IconChip, StatCard, BigStat, DeltaChip, ToneBadge, StatusChip, EntityHeader, TabBar, SegmentedControl, FactList, SummaryRows, Modal, SidePanel, ConfirmDialog, EmptyState, ErrorState, Skeleton, Timeline (trip milestones). JSX, matching the codebase (no TypeScript).
- `frontend/src/shared/ui/data-grid/`: the Deksie DataGrid ported to JSX. Columns declare `type`; the grid picks the renderer (status chip, money right-aligned, date, person, truncate-copy). Search, filters, sort, pagination, row click to side panel. Every list in the app uses it.
- Tokens extend the existing `globals.css` variables. No hex in components.

## 8. Build waves

Each wave is one workflow of at most 8 Sonnet agents with **file ownership** (no two agents touch the same file), then one independent reviewer, then my own browser and API check. Nothing in a later wave starts until the earlier wave passes.

| Wave | Content | Tickets |
| --- | --- | --- |
| 0 Foundation | Kit + data grid port, migration journal fix, demo seed script, API end-to-end harness | M14 base, ENR-005 base |
| 1 Secure and settle | Security fixes, company settings/branches/documents, team verify, redesign of all existing screens onto the kit | ENR-001-004, 007-009, M3/M4/M6 redesign |
| 2 Ad Hoc complete | Mode gate, FTL/PTL, terms, fleet, drivers, trips, execution, POD, closure, failure branches, race safety, clock | AJ-01-39, ENR-015/016/024/025/029-031 |
| 3 Contracts and capacity | RFQ, quotes, compare, award, contracts, amendments, indents, allocation, fleet-owner offers, broker | ENR-018-023, 026-028, 032/033 |
| 4 Money and insight | Plans, payment approval, seats, renewal, earnings, reports, real dashboard metrics, durable notifications, docs reconcile | ENR-010/011/017/034-038 |
| 5 Release check | Full end-to-end run of section 5 as every actor, in the browser and through the API | ENR-005/039 |

Out of scope (needs separate approval): production deploy and backup drills (ENR-040), payment gateway, GPS, driver app, WhatsApp, multi-language.
