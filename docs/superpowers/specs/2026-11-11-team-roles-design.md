# Company roles, permissions and team management — design

Approved in chat on 11 November 2026. Closes the decision in ENR-006 and builds ENR-012/013, with
two agreed changes from the tracker wording: users are added with a temporary password (no invite
email), and there is no seat limit until subscriptions exist (ENR-010/011).

## Decisions

| Topic | Decision |
| --- | --- |
| Kind | Custom roles with permissions, owned by each company |
| Editing | Every role is editable except one protected **Owner** role |
| Adding people | Admin enters name, email, phone, role and a temporary password; the person must change it at first sign-in |
| Seats | No limit for now; one function decides "may this company add a user?" so a limit can plug in later |
| Storage | Permission keys live in code; roles live in a `company_roles` table |

## Permissions

Defined in `backend/src/features/team/team.permissions.js`. The role editor shows only the
permissions that fit the company's type.

| Key | Allows | Company type |
| --- | --- | --- |
| `loads.manage` | Create/edit drafts, publish, extend, cancel | customer |
| `loads.award` | Award a bid, confirm completion | customer |
| `bids.submit` | Place bids | transporter |
| `awards.respond` | Accept or decline an award | transporter |
| `trips.assign` | Enter truck and driver for an accepted award | transporter |
| `network.manage` | Send/answer/cancel/remove/block connections | all |
| `team.manage` | Add, edit, change role, deactivate/reactivate, set a new temporary password | all |
| `roles.manage` | Create, edit and delete roles | all |

Reading (loads, bids, network, notifications) stays open to every active user of the company.

## Preset roles

Created for every company (migration 0008 for existing ones, registration for new ones). They match
the behaviour of the old fixed roles exactly.

| Preset | From old role | Permissions |
| --- | --- | --- |
| Owner (locked) | `admin` | All, including permissions added later |
| Co-admin | `co-admin` | All permissions of the company type |
| Bid manager | `bid_manager` | `loads.*`, `bids.submit`, `awards.respond`, `trips.assign` |
| Trip manager | `trip_manager` | none |
| Viewer | `viewer` | none |
| Accounts | `accounts` | none |

## Rules

1. The Owner role cannot be edited or deleted. A company always keeps at least one active Owner.
2. No escalation: you can only grant permissions you hold. You can only edit or delete a role, or act
   on a person, whose permissions you also hold. Only an Owner can give the Owner role or act on an Owner.
3. Nobody changes their own role or status through team management.
4. A role still held by someone cannot be deleted. Role names are unique per company, ignoring case.
5. Permission changes apply on the next request (the auth middleware reads the role every request).
   Deactivating someone or setting a new temporary password ends their session at once.
6. While an account has a temporary password, every endpoint except `about-me`, `change-password`
   and `logout` answers 403 `PASSWORD_CHANGE_REQUIRED`.
7. Team changes for one company run one at a time (the Owner role row is locked), so two Owners
   cannot demote each other at the same moment and leave none.
8. `root_admin` (platform staff) is unchanged and has no company role.

## Data

- `company_roles`: company, name, description, `permissions text[]`, `is_owner`. Unique
  `(company_id, lower(name))`; one Owner role per company (partial unique index).
- `users`: `role_id` → `company_roles`, `must_change_password`. `user_role` stays for `root_admin`
  and is no longer read for company users; dropping it is a later migration.
- `team_events`: who changed what (action, actor, target user/role, details), written in the same
  transaction as the change. No screen yet.

## API (`/api/v1/team`, signed-in company users)

| Method | Path | Needs |
| --- | --- | --- |
| GET | `/permissions` | `team.manage` or `roles.manage` |
| GET | `/roles` | `team.manage` or `roles.manage` |
| POST | `/roles` | `roles.manage` |
| PATCH / DELETE | `/roles/:roleId` | `roles.manage` |
| GET | `/members` (cursor pages, search, status, role filter) | `team.manage` |
| POST | `/members` | `team.manage` |
| PATCH | `/members/:userId` (name, phone, role) | `team.manage` |
| POST | `/members/:userId/deactivate`, `/reactivate`, `/reset-password` | `team.manage` |

Also `POST /auth/change-password`, and `about-me`/login return `roleName`, `isOwner`,
`permissions` and `mustChangePassword`.

## Frontend

Team page with Members and Roles tabs, add/edit dialogs, a permission checklist per role, a
change-password page, and a `useCan(permission)` hook that replaces the role lists in loads and
network. The server stays the judge; hidden buttons only avoid failing clicks.

## Platform admin access (added 12 Nov 2026)

- **Side panel** in the platform area: Companies, Users, Platform admins, Change password.
- **A company's team** on its platform page: the same Members/Roles screens, with the platform
  admin acting as the company's Owner (`/platform/companies/:companyId/team/...`, same routes and
  rules as `/team`). Changes are recorded in `team_events` with `details.via = 'platform'`.
- **Users**: every company user, searchable by name/email/company, filtered by status and company
  type (`GET /platform/users`). Deactivate/reactivate/new temporary password go through the
  company's team routes, so the company's rules (e.g. one active Owner) still apply.
- **Platform admins** (`/platform/admins`): list, add with a temporary password,
  deactivate/reactivate, new temporary password. Nobody acts on their own account; at least one
  platform admin stays active (all platform admin rows are locked during a change). Changes to
  platform admins are not recorded yet (`team_events` needs a company).

## Out of scope

Seat limits, branch-level permissions, invite emails, a screen for `team_events`, a history of
platform-admin account changes, and dropping `users.user_role`.
