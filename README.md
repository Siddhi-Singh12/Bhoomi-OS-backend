# BHOOMI INTELLIGENCE (भूमितंत्र) 2.0
### AI-Powered Multi-Resolution Agricultural Intelligence & Drone-Assisted Precision Crop Monitoring System

[![Build & Test](https://img.shields.io/badge/System%20Tests-13%2F13%20PASSED-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Node%2024%20%7C%20FastAPI%20%7C%20Vite%20React%2019-blue.svg)]()
[![Geospatial](https://img.shields.io/badge/Geospatial-PostGIS%20%2B%20Sentinel--2%20MSI-orange.svg)]()
[![Competition](https://img.shields.io/badge/Innovation%20Challenge-SEVA%20FIRST%202026-gold.svg)]()

---

## 1. Executive Summary & Problem Formulation

Standard agricultural monitoring applications suffer from the **"Resolution-Cost Dilemma"**:
1. **Satellite-Only Platforms** (e.g., 10m Sentinel-2 MSI) provide wide coverage at zero incremental cost, but are limited by cloud cover, 5-day revisit latency, and 10m/pixel spatial resolution that cannot detect localized pests, weed infestation, or intra-field chlorosis.
2. **Drone-Only Solutions** provide sub-centimetre spatial resolution (1–3 cm/pixel) but are constrained by battery flight endurance (~20 min), pilot availability, and operational costs, making village-scale continuous surveys economically infeasible.

**BHOOMI INTELLIGENCE** solves this dilemma through a **Tiered Multi-Resolution Intelligence Architecture**:
- **Coarse Layer (Satellite + Weather Screening):** Sentinel-2 MSI spectral indices (NDVI, NDWI, NDMI) combined with Open-Meteo meteorological deficit metrics screen entire Panchayats autonomously.
- **Intelligent Prioritisation Engine:** Evaluates satellite anomaly severity, ranks cadastral plots by urgency, and schedules targeted drone flights under a configurable daily capacity constraint (45 fields/day per drone unit).
- **Fine Layer (Drone RGB Computer Vision):** Lawnmower survey missions fly at 60m AGL (GSD: 1.64 cm/px), extracting plant canopy vs. soil backgrounds via Woebbecke Excess Green (ExG), Gitelson VARI, and Otsu segmentation.
- **Mathematical Multi-Resolution Data Fusion:** Fuses satellite indicators ($S_{sat}$) and drone evidence ($S_{drone}$) into an actionable risk index ($S_{fused}$) with complete data provenance and scientific disclosures.
- **Tamper-Evident Proof Dossiers:** Produces SHA-256 hashed and QR-verifiable PDF proof packets for accelerated PMFBY crop insurance claims and Panchayat governance.

```
       +-------------------------------------------------------+
       |   PAN-VILLAGE SATELLITE SCREENING (Sentinel-2, 10m)    |
       |     NDVI Drop, NDWI Moisture Anomaly, Weather Deficit  |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |    INTELLIGENT DRONE PRIORITISATION (Capacity: 45/day) |
       |      Ranks Cadastral Plots: WHERE, WHEN, WHICH First   |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |      PRECISION SURVEY FLIGHT (60m AGL, GSD 1.64 cm)   |
       |    Serpentine Lawnmower Grid: 70% Side, 80% Forward    |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |       DRONE RGB COMPUTER VISION & ANOMALY SEGMENTATION |
       |     Woebbecke ExG (2G-R-B), Gitelson VARI, Otsu Masks |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |        MATHEMATICAL DATA FUSION & PROOF PACKET         |
       |  S_fused = (1-λ) S_sat + λ S_drone | SHA-256 Evidence |
       +-------------------------------------------------------+
```

---

## 2. Mathematical & Scientific Formulations

### A. Ground Sampling Distance (GSD) & Flight Optics
At planned altitude $H = 60\text{ m}$ with reference sensor ($S_w = 13.2\text{ mm}$, $F = 8.8\text{ mm}$, $W_{px} = 5472$):
$$\text{GSD}_h = \frac{S_w \cdot H \cdot 100}{F \cdot W_{px}} = \frac{13.2 \cdot 60 \cdot 100}{8.8 \cdot 5472} \approx 1.64\text{ cm/pixel}$$

### B. Visible Vegetative Indices (Optical RGB Proxies)
- **Excess Green (Woebbecke et al., 1995):**
  $$\text{ExG} = 2G - R - B$$
- **Visible Atmospherically Resistant Index (Gitelson et al., 2002):**
  $$\text{VARI} = \frac{G - R}{G + R - B}$$
- **Otsu Unsupervised Thresholding (Otsu, 1979):**
  Maximizes between-class variance $\sigma_B^2(t) = \omega_0(t)\omega_1(t)[\mu_0(t) - \mu_1(t)]^2$ to segment green vegetation canopy from bare soil.

> **Scientific Limitation Notice:** RGB cameras lack Near-Infrared (NIR) sensors and cannot calculate true NDVI or NDRE. ExG and VARI serve as vegetative greenness proxies. Bhoomi Intelligence explicitly disclaims automated disease diagnosis without agricultural ground-truthing.

### C. Multi-Resolution Mathematical Risk Fusion
- **Satellite Risk Sub-Score ($S_{sat}$):**
  $$S_{sat} = 0.40 \cdot Z_{NDVI} + 0.25 \cdot Z_{NDWI} + 0.20 \cdot W + 0.15 \cdot P$$
  Where:
  - $Z_{NDVI}$: Normalized drop in NDVI below historical seasonal baseline $[0, 1]$.
  - $Z_{NDWI}$: Normalized canopy moisture deficit $[0, 1]$.
  - $W$: Meteorological deficit (7-day rainfall shortfall + thermal anomaly) $[0, 1]$.
  - $P$: Temporal anomaly persistence factor across consecutive observations $[0, 1]$.
- **Drone Risk Sub-Score ($S_{drone}$):**
  $$S_{drone} = \min\left(1.0, \frac{f_{stress}}{0.30}\right)$$
  Where $f_{stress}$ is the surface area fraction of the field identified as chlorotic or desiccated. A $30\%$ stressed area saturates $S_{drone}$ to $1.0$.
- **Unified Fused Risk Score ($S_{fused}$):**
  $$S_{fused} = (1 - \lambda) \cdot S_{sat} + \lambda \cdot S_{drone}$$
  Where $\lambda = 0.65$ by default when drone imagery is acquired (configurable from 0.0 to 1.0), and $\lambda = 0.0$ when only satellite screening data is available.

---

## 3. Technology Stack & Dual-Engine Architecture

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS, Leaflet 1.9, Lucide Icons, Web Speech API (Hindi TTS) |
| **Backend** | Node 24, Express 5, PDFKit, QRCode, Axios, Crypto |
| **Database** | PostgreSQL 16 + PostGIS (Production) / Resilient Embedded Spatial SQLite (Offline / Zero-Config) |
| **AI / Microservice** | Python 3.14, FastAPI, NumPy, Pillow, SciPy |
| **Photogrammetry** | OpenDroneMap (ODM) / WebODM Client with Calibrated Composite Engine |
| **Data Sources** | Sentinel-2 MSI (CDSE / GEE), Open-Meteo, AgriStack UFSI Cadastral Registry |

### Resilient Dual-Engine Spatial Store
To guarantee zero-failure operation in field conditions with spotty internet or air-gapped sandboxes:
1. **Primary Mode:** Connects to PostgreSQL with PostGIS for native spatial indexing (`GIST`), polygon queries, and `ST_DWithin` neighbor calculations.
2. **Resilient Local Mode:** If PostgreSQL is unreachable, the backend automatically fails over to an in-memory / local SQLite database implementing custom PostGIS-equivalent functions (`ST_Area`, `ST_Centroid`, `ST_DWithin`, `ST_Distance`, `ST_AsGeoJSON`) pre-seeded with real cadastral plots from Madhya Pradesh, Punjab, Maharashtra, and Andhra Pradesh.

---

## 4. Getting Started & Installation

### Prerequisites
- Node.js $\ge 20$ (Node 24 recommended)
- Python $\ge 3.10$
- PostgreSQL $\ge 14$ with PostGIS (optional, system auto-switches to embedded store)

### 1. Repository Setup
```bash
git clone https://github.com/siddhisingh/BHOOMI_OS.git
cd BHOOMI_OS
cp .env.example .env
```

### 2. Install Dependencies
```bash
# Backend dependencies
cd Backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Python AI Engine dependencies (optional if running microservice)
cd ../ai_engine
pip install -r requirements.txt
```

### 3. Running the Application

#### Start Backend (Express API on port 5001)
```bash
cd Backend
npm start
```

#### Start Frontend (Vite Dev Server on port 5173)
```bash
cd frontend
npm run dev
```

#### Start Python AI Microservice (FastAPI on port 8000)
```bash
cd ai_engine
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 5. Verification & Test Suite

The system includes an automated 13-point end-to-end integration test verifying the full data pipeline from AgriStack plot import to tamper-evident PDF generation:

```bash
cd Backend
npm test
```

### Verified Test Cases:
1. Backend Root Service & Health Endpoint
2. Spatial Geodesic Area and Centroid Calculation
3. AgriStack Login & Cadastral Plot Import
4. Farm Retrieval & PostGIS Neighbor Search
5. Weather Ingestion & Agro-Climatic Model
6. Sentinel-2 Multi-Spectral Indices (NDVI, NDWI, NDMI)
7. Agricultural Rules Engine (Drought $R_1$ Calamity Evaluation)
8. Drone Mission Planner (60m AGL, 70/80 Overlap, Grid Survey)
9. Drone RGB Computer Vision (ExG & VARI Canopy Analysis)
10. Satellite-Drone Mathematical Risk Fusion Engine
11. Intelligent Prioritisation & Daily Flight Capacity Queue
12. Panchayat Intelligence & Crop-Wise Risk Summary
13. Tamper-Evident PDF Generation & SHA-256 Verification

---

## 6. Project Directory Structure

```
BHOOMI_OS/
├── Backend/
│   ├── db/
│   │   ├── schema.sql                 # PostgreSQL + PostGIS DDL with 2.0 extensions
│   │   └── seed.sql                   # Agricultural benchmark test data
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                  # Database connector with auto-failover
│   │   │   └── sqliteStore.js         # Embedded spatial store with PostGIS-equivalent functions
│   │   ├── controllers/               # Express controllers (drone, panchayat, satellite, etc.)
│   │   ├── middleware/                # Validation & error handling middleware
│   │   ├── routes/                    # API route definitions
│   │   ├── services/
│   │   │   ├── droneIntelligence.service.js  # Drone mission & CV bridge
│   │   │   ├── satellite.service.js   # Sentinel-2 MSI index calculator & time series
│   │   │   ├── weather.service.js     # Weather ingestion & agro-climatic model
│   │   │   ├── rulesEngine.service.js # R0-R3 agronomic rules evaluation
│   │   │   └── pdf.service.js         # Tamper-evident PDF & SHA-256 generator
│   │   └── utils/
│   │       └── geoUtils.js            # Geodesic spherical geometry calculations
│   └── test/
│       └── system_test.js             # 13-point automated integration suite
├── ai_engine/
│   ├── flight_planner.py              # 60m AGL GSD & serpentine survey generator
│   ├── exif_parser.py                 # EXIF GPS validator & image quality check
│   ├── cv_pipeline.py                 # Woebbecke ExG, VARI & Otsu segmentation
│   ├── fusion_engine.py               # Multi-resolution risk formulation engine
│   ├── prioritization_engine.py       # 45 fields/day flight capacity scheduler
│   ├── odm_client.py                  # OpenDroneMap photogrammetry client
│   └── main.py                        # FastAPI microservice
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppHeader.jsx          # Bhoomi Intelligence navigation bar
│   │   │   └── DroneInspectionPanel.jsx # Orthomosaic, ExG, lambda slider & Hindi TTS
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Agricultural intelligence command center
│   │   │   ├── DronePlanner.jsx       # Interactive Leaflet drone mission planner
│   │   │   ├── PanchayatDashboard.jsx # Panchayat surveillance & capacity register
│   │   │   ├── FarmDetail.jsx         # Field-level multi-resolution inspection
│   │   │   └── ProofVerification.jsx  # Cryptographic proof verifier
│   └── dist/                          # Production-optimized build bundle
├── API_DOCUMENTATION.md               # Complete REST API reference
├── .env.example                       # Environment configuration template
└── README.md                          # Project documentation
```

---

## 7. SEVA FIRST Innovation Alignment

| Evaluation Criterion | Implementation in Bhoomi Intelligence |
|---|---|
| **Novelty & Originality** | Replaces brute-force drone scanning with satellite-risk-triggered drone prioritisation; formulates scientific multi-resolution risk fusion ($S_{fused}$). |
| **Technical Feasibility** | 65% software / 35% drone integration split; uses standard RGB camera optics without requiring multimillion-dollar multispectral hardware. |
| **Scientific Integrity** | Explicitly discloses that RGB visible indices (ExG/VARI) are greenness proxies and not true NDVI/NDRE; clearly labels demo vs. live satellite data. |
| **Public Good & Governance** | Directly supports Panchayat administrative decisions and provides tamper-evident SHA-256 PDF dossiers for expedited PMFBY crop insurance settlements. |
| **Scalability & Resilience** | Resilient dual-engine database architecture (PostGIS + SQLite) ensures zero downtime even in rural offline environments. |

---

## 8. Authors & Credits

**Team Code Runners — DTU (Delhi Technological University)**
- **Siddhi Singh** — Principal Software Architect & Full-Stack Lead
- **Hridyansh Awasthi** — AI/ML & Geospatial Systems Engineer
- **Priyanshi Singh** — Backend & Database Architect
- **Anjali** — Frontend UI/UX & Agricultural Domain Specialist

Developed for the **SEVA FIRST Innovation Challenge 2026**.
