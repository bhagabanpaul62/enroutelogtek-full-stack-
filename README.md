# EnrouteLogtek

> **Project overview.** Start with [the master ticket tracker](tickets/README.md) for completed work, open fixes, product decisions and the ordered build queue. Reviewed on 10 November 2026.
>
> The progress/roadmap notes below include historical information. The tracker records current implementation boundaries and verification limits; older “complete” or “frozen” labels do not close its open tickets.

---

## Project Overview

**EnrouteLogtek** is a B2B Logistics Procurement and Transportation Management (TMS) SaaS platform that digitizes the entire freight procurement and transportation lifecycle — from RFQ creation to trip completion.

**Tagline:** SMARTER LOGISTICS. STRONGER FUTURE.

**Domain:** enroutelogtek.in

**Target Users:**

- Manufacturing Companies (Customers)
- Transporters
- Brokers
- Fleet Owners

---

## Tech Stack

| Layer           | Technology                                       |
| --------------- | ------------------------------------------------ |
| Frontend        | Next.js                                          |
| Backend         | Express.js (Node.js)                             |
| Database        | PostgreSQL                                       |
| ORM             | Drizzle ORM                                      |
| Storage         | Cloudflare R2                                    |
| Auth            | JWT (access + refresh tokens) + HttpOnly Cookies |
| Email           | Nodemailer + Hostinger SMTP                      |
| Container       | Docker                                           |
| Reverse Proxy   | Nginx                                            |
| Hosting         | Contabo VPS                                      |
| Package Manager | pnpm                                             |

---

## Project Structure

```
ENROUTE/
├── frontend/                    # Next.js frontend (shell + network UI done)
├── backend/
│   └── src/
│       ├── controllers/
│       │   ├── auth/            # sendOtp, verifyOtp, register, submitRegistration, login, logout, refreshToken, forgetPassword
│       │   ├── document/        # uploadDocument
│       │   ├── platform/        # rootAdmin: approve, reject companies (TODO)
│       │   └── company/         # company management (TODO)
│       ├── routes/
│       │   ├── auth/            # /api/v1/auth/*
│       │   ├── document/        # /api/v1/documents/*
│       │   ├── platform/        # /api/v1/platform/* (rootAdmin only)
│       │   ├── company/         # /api/v1/companies/*
│       │   └── index.js         # collects all routes
│       ├── middleware/
│       │   ├── auth/
│       │   │   ├── auth.middleware.js    # verifies JWT + checks session
│       │   │   └── role.middleware.js    # checks user role permissions
│       │   ├── error/
│       │   │   └── errorHandler.js
│       │   └── upload/
│       │       └── upload.middleware.js
│       ├── services/
│       │   ├── email/
│       │   │   ├── email.service.js
│       │   │   └── emailTemplates.js
│       │   └── storage/
│       │       └── r2.service.js
│       ├── utils/
│       │   ├── asyncHandler.js
│       │   ├── AppError.js
│       │   ├── response.js       # successResponse, errorResponse, validationErrorResponse
│       │   ├── jwt.js            # generateAccessToken, generateRefreshToken, verifyToken
│       │   └── genarateEnrouteId.js
│       ├── db/
│       │   ├── index.js
│       │   └── Schemas/
│       │       ├── auth/         # users, userSessions, otpVerification, passwordResets
│       │       ├── companies/    # companies, branch, documents, companyConnections
│       │       └── subscription/ # subscriptionPlans, companySubscription
│       ├── app.js
│       └── index.js
├── docker-compose.yml
└── DbDesing/
    ├── model.dbml               # Database ERD
    ├── PROJECT_CONTEXT.md       # Daily progress tracker
    ├── BACKEND_ESSENTIALS.md    # Learning reference guide (6 chapters)
    └── AUTH_FLOW.md             # Auth flow diagrams
```

---

## Business Model

- **Subscription-based** SaaS (Starter, Pro, Enterprise, Custom)
- **Per-seat licensing** (no credential sharing)
- **4 Company Types** (strict — one type per company):
  - Customer (manufacturer/shipper)
  - Transporter (logistics provider)
  - Broker (freight broker)
  - Fleet Owner (vehicle owner)
- **Manual approval** — rootAdmin approves companies before login is allowed
- **Network-based** — companies must connect before doing business together

### User Roles

| Role          | Description                    |
| ------------- | ------------------------------ |
| `rootAdmin`   | Platform owner (EnrouteLogtek) |
| `admin`       | Company administrator          |
| `co-admin`    | Company co-admin               |
| `viewer`      | Read-only                      |
| `bidManager`  | RFQ and bidding                |
| `tripManager` | Trip execution                 |
| `accounts`    | Billing/finance                |

---

## Completed APIs

### ✅ Phase 1 — Authentication (COMPLETE — FROZEN)

```
POST /api/v1/auth/send-otp              ← Send OTP to email
POST /api/v1/auth/otp-verification      ← Verify OTP + check if user exists
POST /api/v1/auth/register              ← Create company + user + branch (status: draft)
POST /api/v1/auth/submit-registration   ← Check docs uploaded → status: pending
POST /api/v1/auth/login                 ← Password step: emails a 6-digit login code
POST /api/v1/auth/login/verify-otp      ← Code step: ends other sessions, sets JWT cookies
POST /api/v1/auth/login/resend-otp      ← New login code (30 s cooldown, max 3 resends)
POST /api/v1/auth/logout                ← Kill session + clear cookies
POST /api/v1/auth/refresh-token         ← Get new access token
POST /api/v1/auth/forget-password       ← OTP + reset password + kill sessions

POST /api/v1/documents/upload           ← Upload doc to Cloudflare R2
```

### ✅ Auth Security Features:

- ✅ Email OTP verification before registration
- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT access token (15 min) + refresh token (30 days)
- ✅ HttpOnly cookies (XSS protection)
- ✅ Session table (instant revocation)
- ✅ Emailed login code after the password (10 min, 5 wrong tries, stored hashed)
- ✅ One user one session: a new login signs the older device out on its next request
- ✅ Forgot password kills all sessions
- ✅ authMiddleware (verifies JWT + that token's own session + account still allowed)
- ✅ roleMiddleware (checks permissions)

### Company Status Lifecycle:

```
draft → pending → approved → rejected/blocked
```

---

## Environment Variables (backend/.env)

```env
DATABASE_URL="postgres://enrouteDb:enroute09832@localhost:5432/enroute"
FRONTEND_URL="http://localhost:3000"
PORT=8000
NODE_ENV=development

EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=hello@enroutelogtek.in
EMAIL_PASSWORD=***
EMAIL_FROM=noreply@enroutelogtek.in

JWT_SECRET=***
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

R2_ACCOUNT_ID=***
R2_ACCESS_KEY_ID=***
R2_SECRET_ACCESS_KEY=***
R2_BUCKET_NAME=enroute-documents
R2_PUBLIC_URL=https://pub-***.r2.dev
```

---

## Development Roadmap

```
✅ Phase 1 — Authentication Backend (COMPLETE)
   ✅ Database design (DBML)
   ✅ Docker + PostgreSQL setup
   ✅ Drizzle ORM + all schemas (UUID)
   ✅ Auth APIs (OTP, register, login, logout, refresh, forgot password)
   ✅ Document upload (Multer + Cloudflare R2)
   ✅ Email system (Nodemailer + templates)
   ✅ JWT + session management
   ✅ authMiddleware + roleMiddleware
   ✅ Platform (Master Admin): list by status, detail, approve, reject (reason kept), block (ends sessions), unblock
   ✅ Master Admin UI at /rootAdmin · first root admin: pnpm seed:root-admin (ROOT_ADMIN_EMAIL / ROOT_ADMIN_PASSWORD)

✅ Phase 1.5 — Authentication UI (COMPLETE)
   → Frontend in Next.js
   Public pages:
     ✅ Landing page (+ solution, about, pricing, support)
     ✅ Login
     ✅ OTP verification
     ✅ Registration (user + company + branch)
     ✅ Document upload
     ✅ Waiting for approval
     ✅ 404 page
   Dashboard:
     ✅ Dashboard layout (sidebar + header)
     ✅ Protected routes
     ✅ Profile menu (real user from session; Settings, Help, Sign out)
     ✅ Logout (calls /auth/logout, clears the session, returns to login)
     ✅ Sidebar links: every page exists (one nav config; unbuilt pages say "coming soon")
   Business modules not started yet — shell only

✅ Phase 2 — Company Network (COMPLETE — backend + frontend)
   GET    /network                        ← my connections (filter: status, companyType, search)
   GET    /network/discover               ← approved companies of other types
   GET    /network/requests/incoming
   GET    /network/requests/outgoing
   POST   /network/requests               ← send request { companyId }
   PATCH  /network/requests/:id/accept
   PATCH  /network/requests/:id/reject
   DELETE /network/requests/:id           ← cancel (sender only)
   DELETE /network/:connectionId          ← remove connection
   PATCH  /network/:connectionId/block
   PATCH  /network/:connectionId/unblock  ← deletes the row; a fresh request is needed
   Frontend: /<type>/network with Connections, Requests, Discover, Blocked tabs

🔜 Phase 3 — RFQ System
   POST /rfq
   GET  /rfq
   GET  /rfq/:id
   PATCH /rfq/:id
   DELETE /rfq/:id
   POST /rfq/:id/invite

🔜 Phase 4 — Live Bidding
   POST /bid
   GET  /bid
   PATCH /bid
   (WebSocket for real-time, max 5 bids, countdown timer)

🔜 Phase 5 — Contract Award
🔜 Phase 6 — Trip Management (vehicle, driver, tracking, POD)
🔜 Phase 7 — Analytics + Reports + Notifications
```

---

## Frontend Architecture (Next.js)

Single Next.js app with route groups:

```
app/
├── (public)/
│   ├── login/
│   ├── register/
│   └── landing/
│
└── (dashboard)/
    ├── customer/
    ├── transporter/
    ├── broker/
    └── fleet-owner/
```

After login, redirect based on `companyType` from JWT:

- Customer → `/customer`
- Transporter → `/transporter`
- Broker → `/broker`
- Fleet Owner → `/fleet-owner`

---

## How to Start Backend

```bash
# Start PostgreSQL
docker-compose up -d

# Install dependencies
cd backend
pnpm install

# Push schemas to DB
pnpm drizzle-kit push

# Start server
pnpm start
```

---

## Key Decisions Made

| Decision           | Choice                               | Reason                              |
| ------------------ | ------------------------------------ | ----------------------------------- |
| Auth type          | Hybrid (JWT + Session DB)            | Speed + revocation control          |
| Token storage      | HttpOnly cookies                     | XSS protection                      |
| ID type            | UUID                                 | Security (non-guessable)            |
| OTP storage        | Plain text                           | Expires in 10min, deleted after use |
| Password hashing   | bcrypt (12 rounds)                   | Industry standard                   |
| Company type       | Strict (one type per company)        | Business rule                       |
| File storage       | Cloudflare R2                        | Cost-effective, CDN                 |
| Frontend structure | Single Next.js app with route groups | One codebase, different experiences |
| Passport.js        | Not used                             | Custom email/OTP/JWT sufficient     |

---

## Documentation Files

| File                             | Purpose                                  |
| -------------------------------- | ---------------------------------------- |
| `DbDesing/PROJECT_CONTEXT.md`    | Daily progress tracker + what to do next |
| `DbDesing/BACKEND_ESSENTIALS.md` | 6-chapter backend learning reference     |
| `DbDesing/AUTH_FLOW.md`          | Auth flow diagrams                       |
| `DbDesing/model.dbml`            | Database ERD                             |

---

## For AI Agent — Start Here

1. Read this README for the product overview.
2. Read [tickets/README.md](tickets/README.md) for current status, evidence and dependencies.
3. Choose the next unblocked ticket from that ordered queue and discuss its implementation before changing code.
4. Backend API base URL: `http://localhost:8000/api/v1`.
5. Use the tracker's verification record; do not assume that older completion notes prove current runtime behavior.

**Development philosophy:** Business First → Database → Backend → Frontend → Deploy

**Key rule:** Build only what's needed. No premature optimization.
