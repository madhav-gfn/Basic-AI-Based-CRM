# Basic AI-Based CRM

I'm building a CRM system with AI capabilities from the ground up. This document tracks what I've built so far, how to run it, and where the project is headed.

---

## Dev Log

Started the backend from scratch with Node.js, TypeScript, Express, and Prisma — designed the full PostgreSQL schema with 6 models and wrote a seed script that generates 2000 realistic customers with persona-driven orders, segments, campaigns, and communication event timelines.

Built out the customer domain end to end — repository layer, controller for profile/metrics/top-customers, and CSV ingestion via Multer with bulk inserts using Prisma's `createMany`.

Added a segment builder — a `SegmentService` that translates a `SegmentFilters` object into a live Prisma query, handling direct field filters, relation checks, and aggregation sub-queries via `groupBy + having`. Two endpoints: preview audience count without saving, or evaluate and persist in one call.

---

## What I've Built So Far

### Backend (Node.js + TypeScript + Express + Prisma)

I set up the entire backend from scratch — config, database layer, API routes, and data seeding.

#### Database Schema (PostgreSQL via Prisma)

I designed a relational schema with 6 models:

- **Customer** — stores name, email, phone, gender, city, signup date
- **Order** — linked to a customer, tracks order value, date, and category
- **Segment** — a named audience group with a JSON rule definition (e.g. city = Delhi, totalSpend >= 5000)
- **Campaign** — a marketing campaign targeting a segment via a specific channel (EMAIL, SMS, WHATSAPP, RCS)
- **Communication** — one record per customer per campaign, holds the personalised message and delivery status
- **CommunicationEvent** — lifecycle events per communication (SENT → DELIVERED → OPENED → READ → CLICKED → CONVERTED)

#### Seed Data

I wrote a comprehensive seed script (`Prisma/seed.ts`) that generates realistic demo data:

- 2000 customers across 5 personas (VIP, REGULAR, DORMANT, NEW, DISCOUNT_HUNTER)
- Persona-driven order counts, values, and categories
- 10 named segments with rule-based definitions
- 12 campaigns across all channels and statuses
- Full communication + event timelines with realistic open/click/convert rates

Run it with:
```bash
npm run db:seed
```

#### Project Structure

```
Backend/
├── Prisma/
│   ├── schema.prisma        # DB schema
│   └── seed.ts              # Seed script
├── src/
│   ├── config/
│   │   └── database.ts      # Prisma singleton + type re-exports
│   ├── controllers/
│   │   ├── customer.controller.ts    # profile, metrics, top customers
│   │   └── ingestion.controller.ts  # CSV upload for customers & orders
│   ├── repositories/
│   │   └── customer.repository.ts   # all DB access for customer domain
│   ├── routes/
│   │   ├── customer.routes.ts       # GET /api/customers/*
│   │   └── ingestion.routes.ts      # POST /api/*/upload
│   └── index.ts             # Express app entry point
├── .env
├── package.json
└── tsconfig.json
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/customers/top?limit=10` | Top customers by lifetime spend |
| `GET` | `/api/customers/:id` | Customer profile with full order history |
| `GET` | `/api/customers/:id/metrics` | Aggregated metrics (total orders, spend, AOV, last purchase) |
| `POST` | `/api/customers/upload` | Bulk import customers via CSV |
| `POST` | `/api/orders/upload` | Bulk import orders via CSV |

#### Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Language | TypeScript 5 |
| Framework | Express 4 |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| File uploads | Multer (memory storage) |
| CSV parsing | csv-parser |
| Dev server | ts-node-dev |

---

## How to Run

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- A database named `xeno_crm` created

### 1. Install dependencies
```bash
cd Backend
npm install
```

### 2. Configure environment
Copy `env.example` to `.env` and fill in your values:
```bash
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/xeno_crm"
PORT=3001
NODE_ENV=development
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Push schema to database
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed the database
```bash
npm run db:seed
```

### 5. Start the dev server
```bash
npm run dev
```

Server runs at `http://localhost:3001`

---

## CSV Import Format

### Customers (`POST /api/customers/upload`)
```
name,email,phone,gender,city,signup_date
John Doe,john@example.com,+919000000001,Male,Delhi,2024-01-15
```
Required: `name`, `email`. Everything else is optional.

### Orders (`POST /api/orders/upload`)
```
customer_id,order_date,order_value,category
<uuid>,2024-03-10,1299.00,Apparel
```
All four columns are required.

---

## What's Next

- [x] Segment builder API (evaluate rules against live customer data)
- [ ] Campaign creation and launch API
- [ ] AI-powered message generation (Anthropic)
- [ ] Channel service for message delivery simulation
- [ ] Frontend dashboard
