# EnrouteLogTech

A B2B Logistics Procurement and Transportation Management (TMS) SaaS platform that digitizes the entire freight procurement and transportation lifecycle, from RFQ creation to trip completion.

## Overview

EnrouteLogTech is a multi-company platform where every company operates independently while interacting through a controlled business network. It serves manufacturers, transporters, brokers, and fleet owners with a subscription-based business model.

### Core Features
- Transporter onboarding & vendor network management
- RFQ creation, live bidding, and contract awarding
- Trip execution & fleet management
- Broker & document management
- Subscription & seat-based access control

### Company Types (one type per company)
- Customer
- Transporter
- Broker
- Fleet Owner

### User Roles
`rootAdmin` · `admin` · `viewer` · `bidManager` · `tripManager` · `accounts`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js |
| Backend | Express.js |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Storage | Cloudflare R2 |
| Auth | JWT (access + refresh tokens) |
| Container | Docker |
| Reverse Proxy | Nginx |
| Hosting | Contabo VPS |

## Project Structure

```
ENROUTE/
├── frontend/              # Next.js frontend
├── backend/              # Express.js backend
│   └── src/
│       ├── controllers/  # Request handlers
│       ├── services/     # Business logic
│       ├── routes/       # API endpoints
│       ├── middleware/   # Auth & validation
│       ├── utils/        # Helpers
│       └── db/
│           ├── Schemas/  # Drizzle schemas
│           └── index.js  # DB connection
├── docker-compose.yml
└── DbDesing/             # Database design (DBML + context docs)
```

## Getting Started

### Prerequisites
- Node.js (v22+)
- pnpm
- Docker & Docker Compose

### Setup
1. Clone the repository
2. Start PostgreSQL: `docker-compose up -d`
3. Install backend dependencies: `cd backend && pnpm install`
4. Configure `.env` (see `.env.example`)
5. Push schemas to DB: `pnpm drizzle-kit push`
6. Start the server: `pnpm start`

## Development Progress

### ✅ Completed
- Database design (DBML)
- Docker + PostgreSQL setup
- Drizzle ORM configuration
- Core schemas: companies, branches, users
- Subscription schemas: subscription plans, company subscriptions
- Path alias configuration (Node.js subpath imports)
- Express app foundation (helmet, cors, error handling)
- Authentication architecture design (JWT + refresh tokens + sessions)

### 🔄 In Progress
- Controllers, routes, and middleware
- Registration & authentication APIs

### 📋 Upcoming
- RFQ management & invitations
- Live bidding system
- Contract management
- Trip, vehicle & driver management
- POD management
- Analytics & reports

## Development Philosophy

Business First → Database → Backend → Frontend → Deploy

Build only what is needed for current business requirements. Avoid premature optimization.

---

*This README is updated regularly as the project progresses. For detailed daily context, see `DbDesing/PROJECT_CONTEXT.md`.*
