# Network API

The Network module manages company-to-company relationships inside Enroute.

Companies can:

- Discover other companies
- Send connection requests
- Accept connection requests
- Reject connection requests
- Cancel outgoing requests
- View connected companies
- Remove connections
- Block companies
- Unblock companies

---

# Base URL

/api/v1/network

All endpoints require authentication unless explicitly mentioned otherwise.

The authenticated user's `companyId` is taken from:

req.user.companyId

The client must NOT send the current user's company ID for network operations.

---

# Company Connection Model

A connection is stored using:

sourceCompanyId
targetCompanyId
connectionStatus

Example:

Customer A sends a request to Transporter B:

A → B

sourceCompanyId = A
targetCompanyId = B
status = pending

After B accepts:

A → B
status = accepted

The database stores one connection record.

The relationship is interpreted from the perspective of the authenticated company.

If A is viewing the connection:

A → B

B is the connected company.

If B is viewing the same connection:

A → B

A is the connected company.

---

# Connection Status

Supported statuses:

- pending
- accepted
- rejected
- blocked

Status meanings:

| Status | Meaning |
|---|---|
| pending | Connection request has been sent but not accepted |
| accepted | Both companies are connected |
| rejected | Request was rejected |
| blocked | Connection has been blocked |

---

# API Routes

## 1. Get My Network

### GET /network

Returns companies related to the authenticated company's network.

Supports:

- Status filtering
- Company type filtering
- Company name search
- Cursor pagination
- Limit

### Request

GET /api/v1/network

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| status | string | No | Filter by connection status |
| companyType | string | No | Filter by connected company's type |
| search | string | No | Search connected company by name |
| cursor | string | No | Cursor returned from previous request |
| limit | number | No | Number of records to return |

Maximum limit:

100

Default limit:

20

### Examples

Get first page:

GET /api/v1/network?limit=20

Get accepted connections:

GET /api/v1/network?status=accepted&limit=20

Get transporters:

GET /api/v1/network?companyType=transporter&limit=20

Search company:

GET /api/v1/network?search=ABC&limit=20

Combine filters:

GET /api/v1/network?status=accepted&companyType=transporter&search=ABC&limit=20

Next page:

GET /api/v1/network?limit=20&cursor=YOUR_NEXT_CURSOR

---

# Network Pagination

Network uses cursor-based pagination.

The API does not use OFFSET pagination.

The client receives:

- hasMore
- nextCursor

Example response:

{
  "success": true,
  "data": [
    {
      "connectionId": "connection-id",
      "createdAt": "2026-09-10T10:00:00.000Z",
      "status": "accepted",

      "sourceCompany": {
        "id": "company-a",
        "name": "ABC Logistics",
        "type": "customer",
        "logoUrl": "..."
      },

      "targetCompany": {
        "id": "company-b",
        "name": "XYZ Transport",
        "type": "transporter",
        "logoUrl": "..."
      }
    }
  ],

  "pagination": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "eyJjcmVhdGVkQXQi..."
  }
}

---

## How Cursor Pagination Works

First request:

GET /network?limit=20

The server retrieves:

limit + 1

records.

If the client requests:

limit = 20

the database retrieves:

21

records.

If 21 records exist:

hasMore = true

The API returns only 20 records and creates a nextCursor from the last returned record.

The next request uses:

GET /network?limit=20&cursor=NEXT_CURSOR

The server continues from that position.

If fewer than 21 records are found:

hasMore = false

nextCursor = null

---

# Network Sorting

The current cursor implementation uses stable ordering:

createdAt DESC
id DESC

The `id` acts as a tie-breaker when multiple connections have the same `createdAt`.

Current ordering:

ORDER BY createdAt DESC, id DESC

Dynamic sorting should only be added after implementing cursor support for each sort field.

---

# 2. Discover Companies

### GET /network/discover

Returns companies that can potentially be connected with the authenticated company.

This endpoint is different from `/network`.

`/network`

Returns existing relationships.

`/network/discover`

Returns companies available for discovery/connection.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| search | string | No | Search company name |
| companyType | string | No | Filter by company type |
| cursor | string | No | Pagination cursor |
| limit | number | No | Number of records |

Example:

GET /api/v1/network/discover?search=ABC&companyType=transporter&limit=20

Possible UI:

ABC Transport
Transporter

[ Connect ]

XYZ Logistics
Transporter

[ Connect ]

---

# 3. Get Incoming Requests

### GET /network/requests/incoming

Returns connection requests received by the authenticated company.

Example:

Company B receives:

A → B

The request appears in B's incoming requests.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| cursor | string | No | Pagination cursor |
| limit | number | No | Number of records |

Example:

GET /api/v1/network/requests/incoming?limit=20

Response example:

{
  "success": true,
  "data": [
    {
      "requestId": "request-id",
      "status": "pending",

      "company": {
        "id": "company-a",
        "name": "ABC Logistics",
        "type": "customer",
        "logoUrl": "..."
      }
    }
  ],

  "pagination": {
    "limit": 20,
    "hasMore": false,
    "nextCursor": null
  }
}

UI actions:

[ Accept ]

[ Reject ]

---

# 4. Get Outgoing Requests

### GET /network/requests/outgoing

Returns connection requests sent by the authenticated company.

Example:

A sends:

A → B

A sees this in outgoing requests.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| cursor | string | No | Pagination cursor |
| limit | number | No | Number of records |

Example:

GET /api/v1/network/requests/outgoing?limit=20

Response example:

{
  "success": true,
  "data": [
    {
      "requestId": "request-id",
      "status": "pending",

      "company": {
        "id": "company-b",
        "name": "XYZ Transport",
        "type": "transporter",
        "logoUrl": "..."
      }
    }
  ],

  "pagination": {
    "limit": 20,
    "hasMore": false,
    "nextCursor": null
  }
}

UI action:

[ Cancel Request ]

---

# 5. Send Connection Request

### POST /network/requests

Creates a new company connection request.

### Request Body

{
  "companyId": "target-company-id"
}

The authenticated company becomes:

sourceCompanyId

The requested company becomes:

targetCompanyId

New connection:

sourceCompanyId = currentCompany
targetCompanyId = requestedCompany
status = pending

Example:

A sends request to B:

A → B

pending

### Success

{
  "success": true,
  "data": {
    "connectionId": "connection-id",
    "status": "pending"
  },
  "message": "Connection request sent successfully"
}

### Validation

The server should reject:

- Missing companyId
- Invalid companyId
- Requesting yourself
- Duplicate pending request
- Existing accepted connection
- Blocked relationship
- Invalid company relationship/business rule

---

# 6. Accept Connection Request

### PATCH /network/requests/:requestId/accept

Accepts an incoming connection request.

Only the target company should be allowed to accept the request.

Example:

A → B

B calls:

PATCH /network/requests/:requestId/accept

Result:

A → B

accepted

### Authorization

The authenticated company must be:

targetCompanyId

The requester cannot accept their own request.

### Success

{
  "success": true,
  "data": {
    "connectionId": "connection-id",
    "status": "accepted"
  },
  "message": "Connection request accepted successfully"
}

---

# 7. Reject Connection Request

### PATCH /network/requests/:requestId/reject

Rejects an incoming connection request.

Example:

A → B

B rejects.

Result:

A → B

rejected

### Authorization

Only the target company can reject the request.

### Success

{
  "success": true,
  "data": {
    "connectionId": "connection-id",
    "status": "rejected"
  },
  "message": "Connection request rejected successfully"
}

---

# 8. Cancel Outgoing Request

### DELETE /network/requests/:requestId

Cancels a pending connection request created by the authenticated company.

Example:

A → B

A sends:

DELETE /network/requests/:requestId

The request is cancelled.

### Authorization

Only the source company can cancel its outgoing request.

The request must be:

pending

### Success

{
  "success": true,
  "message": "Connection request cancelled successfully"
}

---

# 9. Remove Connection

### DELETE /network/:connectionId

Removes an existing accepted connection.

Example:

A → B

accepted

A removes the connection.

The relationship is no longer active.

### Authorization

The authenticated company must be one of:

sourceCompanyId
targetCompanyId

### Success

{
  "success": true,
  "message": "Connection removed successfully"
}

---

# 10. Block Company

### PATCH /network/:connectionId/block

Blocks a company relationship.

Example:

A → B

accepted

A blocks B.

Result:

A → B

blocked

### Authorization

The authenticated company must belong to the connection.

### Success

{
  "success": true,
  "data": {
    "connectionId": "connection-id",
    "status": "blocked"
  },
  "message": "Company blocked successfully"
}

---

# 11. Unblock Company

### PATCH /network/:connectionId/unblock

Removes the blocked state.

Example:

A → B

blocked

A unblocks B.

Decided rule: **blocked → removed**. The connection row is deleted. Nothing is restored
without consent; either company can send a fresh request later.

Only the company that blocked can unblock. The blocked company never sees the blocked
row (`/network`, requests, discover all hide it), so for them this returns 404.

### Success

{
  "success": true,
  "data": null,
  "message": "Company unblocked successfully"
}

---

# Decided Business Rules

These were open questions in this document; they are now implemented.

| Rule | Decision | Where in code |
|---|---|---|
| Which company types can connect | Only **different** types (customer ↔ transporter, broker ↔ fleet owner, ...). Same type → 400 | `network.constants.js` → `canCompanyTypesConnect` |
| Who can change the network | Roles with the `network.manage` permission (Owner and Co-admin by default). Everyone in the company can read (`GET`) | `team/team.permissions.js` → `PERMISSIONS.NETWORK_MANAGE` |
| Unblock | Removes the connection (see above) | `network.service.js` → `unblockConnection` |
| Request again after rejection | Allowed any time. The old rejected row is replaced by a new pending one. Use Block to stop repeat requests | `network.service.js` → `sendRequest` |
| Block from which states | Any state that isn't already blocked (pending, accepted, rejected) - also lets a company block someone who keeps sending requests | `network.service.js` → `blockConnection` |
| Cancel / remove | The row is deleted (not soft-deleted) | `network.service.js` |
| Discover | Approved companies of an allowed type, excluding your own company and any company you have a pending, accepted or blocked row with | `network.service.js` → `discoverCompanies` |

Database guarantees (migration `0001_network_rules.sql`):

- one row per pair of companies, whatever the direction (unique index on `least/greatest(source, target)`)
- a company can't connect to itself (check constraint)
- `blocked_by_company_id` records who blocked

Response details beyond the examples above:

- Every response has `message`. List responses are `{ success, message, data: [...], pagination }`.
- `/network` items also include `company` (the other company, from your point of view) and
  `direction` (`outgoing` = you sent the request, `incoming` = they did).
- Company objects are `{ id, name, type, logoUrl, enrouteCompanyId }` - never GST, PAN, email or phone.
- Validation errors return **422** with `{ message, error: { field: message } }`. A broken cursor returns 400.

---

# Complete Route List

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /network | Get my network |
| GET | /network/discover | Discover companies |
| GET | /network/requests/incoming | Get received requests |
| GET | /network/requests/outgoing | Get sent requests |
| POST | /network/requests | Send connection request |
| PATCH | /network/requests/:requestId/accept | Accept request |
| PATCH | /network/requests/:requestId/reject | Reject request |
| DELETE | /network/requests/:requestId | Cancel outgoing request |
| DELETE | /network/:connectionId | Remove connection |
| PATCH | /network/:connectionId/block | Block connection |
| PATCH | /network/:connectionId/unblock | Unblock connection |

---

# Connection Lifecycle

## Sending

A → B

pending

---

## Accepted

A → B

accepted

---

## Rejected

A → B

rejected

---

## Cancelled

A → B

pending

        ↓

A cancels request

        ↓

Request no longer active

---

## Blocked

A → B

accepted

        ↓

A blocks B

        ↓

blocked

---

# Request Direction

The direction of a request is important for the UI.

## I sent the request

Current company:

A

Connection:

A → B

Status:

pending

UI:

[ Cancel Request ]

---

## I received the request

Current company:

A

Connection:

C → A

Status:

pending

UI:

[ Accept ] [ Reject ]

---

## Connected

Current company:

A

Connection:

A → B

or:

C → A

Status:

accepted

UI:

[ View ] [ Remove ] [ Block ]

---

# Determining the Connected Company

A connection has:

sourceCompanyId
targetCompanyId

The authenticated company can be either side.

If:

sourceCompanyId === req.user.companyId

then:

connectedCompany = targetCompany

If:

targetCompanyId === req.user.companyId

then:

connectedCompany = sourceCompany

This logic is important for:

- Search
- Company type filtering
- Company information
- Request direction
- UI actions

---

# Network Query Architecture

The `/network` query is built using dynamic conditions.

Base condition:

sourceCompanyId = currentCompanyId

OR

targetCompanyId = currentCompanyId

Additional filters are added to the same conditions array.

Example:

const conditions = [];

conditions.push(
  or(
    eq(companyConnections.sourceCompanyId, companyId),
    eq(companyConnections.targetCompanyId, companyId)
  )
);

if (status) {
  conditions.push(...);
}

if (companyType) {
  conditions.push(...);
}

if (search) {
  conditions.push(...);
}

if (cursor) {
  conditions.push(...);
}

The database query is executed only once after all conditions are prepared.

---

# Database Joins

The company connection table contains only:

sourceCompanyId
targetCompanyId

Company information is stored in the companies table.

Therefore `/network` joins companies twice.

Source:

companyConnections.sourceCompanyId
        ↓
sourceCompany

Target:

companyConnections.targetCompanyId
        ↓
targetCompany

Example:

company_connections

| source | target | status |
|---|---|---|
| A | B | accepted |

companies

| id | name | type |
|---|---|---|
| A | ABC Logistics | customer |
| B | XYZ Transport | transporter |

The API can therefore return:

{
  "sourceCompany": {
    "id": "A",
    "name": "ABC Logistics",
    "type": "customer"
  },

  "targetCompany": {
    "id": "B",
    "name": "XYZ Transport",
    "type": "transporter"
  }
}

---

# Security Rules

Every network endpoint must determine the current company from the authenticated session/JWT.

Do not trust:

req.body.companyId

as the current company.

The current company must come from:

req.user.companyId

For operations on a connection, verify that the authenticated company actually belongs to the connection.

Example:

A must not be able to accept:

C → B

unless A is the target company.

---

# Recommended Validation

All request parameters should be validated before database operations.

Validate:

- companyId
- requestId
- connectionId
- status
- companyType
- limit
- cursor
- search

Limit:

minimum = 1
maximum = 100

Example:

limit = 20

If the client sends:

limit = 5000

the API should cap or reject the value.

---

# Recommended HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Successful GET/PATCH |
| 201 | Connection request created |
| 400 | Invalid request |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Connection/company/request not found |
| 409 | Duplicate/conflicting connection |
| 422 | Validation error |
| 500 | Internal server error |

---

# Network Module Architecture

features/

└── network/

    ├── controllers/
    │   ├── network.controller.js
    │   ├── request.controller.js
    │   └── discovery.controller.js
    │
    ├── routes/
    │   └── network.routes.js
    │
    ├── schemas/
    │   └── companyConnection.Schema.js
    │
    ├── validations/
    │   └── network.validation.js
    │
    └── services/
        └── network.service.js

---

# Controller Responsibility

Controllers should:

1. Read request data
2. Validate input
3. Call service/business logic
4. Return HTTP response

Controllers should not contain large amounts of business logic.

---

# Service Responsibility

Services should handle:

- Connection creation
- Duplicate checking
- Permission/business rules
- Accept/reject logic
- Block/unblock logic
- Connection removal
- Discovery rules

Example:

request.controller.js

        ↓

network.service.js

        ↓

database

---

# Future Improvements

Possible future additions:

- Network statistics
- Recently connected companies
- Favorites
- Company verification badge
- Network activity
- Notifications
- Connection notes
- Connection tags
- Advanced search
- Multiple sort fields
- Full-text search
- Network analytics
- Enterprise access rules

These should be added only when the product requirements require them.