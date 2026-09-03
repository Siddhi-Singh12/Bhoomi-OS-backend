# Bhoomi OS — Backend

**Verified Evidence Layer for Indian Agriculture**
Turning "my crop failed" into a signed, satellite-backed Proof Packet — in minutes, not months.

Built for **DECODE SIH 2026**.

---

## What is Bhoomi OS?

AI-powered crop stress detection and verified evidence generation for smallholder farmer insurance claims. Instead of relying on manual field inspections (which take 30–90+ days), Bhoomi OS uses public satellite (Sentinel-2 via Google Earth Engine) and weather data to detect crop stress early and auto-generate a timestamped, verifiable Proof Packet — ready for PMFBY submission.

**Flow:** `REGISTER → MONITOR → DETECT → EXPLAIN → PROVE`

## This repo

This is the **backend** service — the API and orchestration layer of Bhoomi OS.

**Responsibility (Person 1 — Backend + Database + Nearby Alerts):**
- Farmer & farm registration APIs
- Receiving and storing farm plot geometry (PostGIS)
- Orchestrating calls to satellite (GEE) + weather data sources
- Calling the Python Rules Engine and storing analysis results
- Assembling and triggering Proof Packet PDF generation
- Nearby-farm alert detection via PostGIS spatial queries

## Tech stack

| Layer | Tech |
|---|---|
| API | Node.js + Express |
| Database | PostgreSQL + PostGIS |
| Rules Engine (external) | Python (owned by ML teammate) |
| Satellite data | Google Earth Engine (Sentinel-2) |
| Weather data | Weather API |

## Project structure

```
backend/
├── src/
│   ├── config/       # DB connection, env setup
│   ├── routes/       # Express route definitions
│   ├── controllers/  # request handling logic
│   ├── services/      # satellite, weather, rules engine, PDF, storage
│   ├── models/        # SQL query functions per table
│   ├── middleware/    # error handling, validation, auth
│   └── utils/         # geo helpers, logging
├── db/
│   └── schema.sql     # PostgreSQL + PostGIS schema
├── server.js
└── package.json
```

## Setup

```bash
git clone https://github.com/Siddhi-Singh12/Bhoomi-OS-backend.git
cd Bhoomi-OS-backend
npm install
```

Create a `.env` file in the root (not committed — see `.env.example`):

```
PORT=5001
DATABASE_URL=postgres://<user>@localhost:5432/bhoomi_os
```

Set up the database:

```bash
createdb bhoomi_os
psql bhoomi_os -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql bhoomi_os -f db/schema.sql
```

Run the server:

```bash
npm run dev
```

## Status

🚧 In progress — backend scaffolding and database schema complete. Core APIs (farmer, farm, analysis, proof packet, alerts) under active development.
