# Bhoomi Intelligence 2.0 — REST API Specification

Comprehensive technical specification for the Bhoomi Intelligence API suite.
All endpoints return JSON responses with standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Error`).

---

## 1. System & Health

### `GET /`
Returns service identification and operational status.
- **Response**:
```json
{
  "service": "Bhoomi Intelligence API",
  "version": "2.0.0",
  "status": "operational",
  "spatial_engine": "POSTGIS_OR_SQLITE_RESILIENT",
  "drone_capacity_limit_daily": 45
}
```

---

## 2. Farmer & Cadastral Plot Management

### `POST /api/agristack/login`
Simulates farmer authentication against AgriStack UFSI.
- **Request Body**:
```json
{
  "agristack_id": "AGR-IND-MP-2024-00192",
  "phone": "9876543210"
}
```
- **Response**:
```json
{
  "success": true,
  "farmer": {
    "id": 1,
    "name": "Ramesh Patel",
    "phone": "9876543210",
    "agristack_id": "AGR-IND-MP-2024-00192",
    "language": "hi"
  }
}
```

### `POST /api/agristack/import-plot`
Imports cadastral agricultural plot boundary directly from AgriStack registry into the geospatial database.
- **Request Body**:
```json
{
  "agristack_id": "AGR-IND-MP-2024-00192",
  "phone": "9876543210",
  "crop_type": "Wheat"
}
```

### `GET /api/farms`
Lists registered agricultural farms with calculated geodesic areas and boundary GeoJSON geometries.

### `GET /api/farms/:id`
Retrieves detailed profile of a single agricultural field.

### `GET /api/farms/:id/neighbors?radius=2`
Performs a PostGIS / geodesic spatial radius search to identify neighboring farms within `radius` kilometres.

---

## 3. Satellite & Weather Intelligence

### `POST /api/satellite/indices`
Calculates Sentinel-2 multi-spectral indices (NDVI, NDWI, NDMI), extracts 8-point time series, and clouds.
- **Request Body**:
```json
{
  "coordinates": [
    [75.602, 21.801],
    [75.608, 21.801],
    [75.608, 21.808],
    [75.602, 21.808],
    [75.602, 21.801]
  ],
  "date": "2026-03-15"
}
```
- **Response**:
```json
{
  "status": "success",
  "indices": {
    "ndvi": 0.28,
    "ndwi": 0.08,
    "ndmi": 0.05
  },
  "cloud_coverage_pct": 2.1,
  "data_provenance": {
    "sensor": "Sentinel-2 MSI Level-2A",
    "resolution_m": 10,
    "dataset_mode": "DEMO_CALIBRATED"
  },
  "timeseries_history": [
    { "date": "2026-01-15", "ndvi": 0.58, "ndwi": 0.24 },
    { "date": "2026-02-01", "ndvi": 0.49, "ndwi": 0.19 },
    { "date": "2026-02-15", "ndvi": 0.38, "ndwi": 0.12 },
    { "date": "2026-03-01", "ndvi": 0.28, "ndwi": 0.08 }
  ]
}
```

### `GET /api/weather/:lat/:lng`
Ingests meteorological conditions (7-day cumulative rainfall, daily temperature, humidity, wind speed) from Open-Meteo with agro-climatic seasonal baselines.

---

## 4. Drone Intelligence & Mission Planning

### `POST /api/drone/plan-mission`
Computes survey flight trajectory, GSD, overlap spacing, and QGroundControl `.plan` export over field boundary.
- **Request Body**:
```json
{
  "farm_id": 1,
  "altitude_m": 60.0,
  "side_overlap_pct": 70.0,
  "forward_overlap_pct": 80.0,
  "flight_speed_ms": 5.0
}
```
- **Response**:
```json
{
  "status": "success",
  "mission_parameters": {
    "altitude_m": 60.0,
    "side_overlap_pct": 70.0,
    "forward_overlap_pct": 80.0,
    "flight_speed_ms": 5.0,
    "gsd_cm_per_pixel": 1.64,
    "footprint_width_m": 90.0,
    "footprint_height_m": 60.0
  },
  "metrics": {
    "total_distance_m": 840.5,
    "estimated_flight_time_min": 2.8,
    "estimated_photo_count": 48,
    "batteries_required": 1
  },
  "trajectory_geojson": { ... },
  "qgroundcontrol_plan": { ... }
}
```

### `POST /api/drone/cv-analyze`
Performs RGB computer vision analysis on uploaded aerial drone imagery (Excess Green, VARI, Otsu canopy segmentation, stress clusters).
- **Request Body**:
```json
{
  "farm_id": 1,
  "image_path": "path/to/aerial_image.jpg"
}
```
- **Response**:
```json
{
  "status": "success",
  "canopy_metrics": {
    "canopy_cover_pct": 74.5,
    "soil_background_pct": 25.5,
    "exg_index_mean": 38.4,
    "vari_index_mean": 0.184
  },
  "stress_metrics": {
    "stress_area_fraction_field": 0.185,
    "severity_level": "HIGH",
    "identified_stress_clusters": 2
  },
  "scientific_disclaimer": "RGB imagery operates strictly in visible spectrum (400-700nm). ExG and VARI serve as canopy greenness proxies. Not a replacement for NIR NDVI."
}
```

### `POST /api/drone/fuse`
Executes mathematical multi-resolution risk fusion combining satellite indicators ($S_{sat}$) and drone inspection evidence ($S_{drone}$).
- **Formula**:
$$S_{sat} = 0.40 \cdot Z_{NDVI} + 0.25 \cdot Z_{NDWI} + 0.20 \cdot W + 0.15 \cdot P$$
$$S_{drone} = \min(1.0, f_{stress} / 0.30)$$
$$S_{fused} = (1 - \lambda) \cdot S_{sat} + \lambda \cdot S_{drone}$$
- **Request Body**:
```json
{
  "farm_id": 1,
  "satellite_ndvi": 0.28,
  "satellite_ndwi": 0.08,
  "baseline_ndvi": 0.52,
  "rainfall_7d_mm": 4.2,
  "avg_temp_c": 35.8,
  "persistence_days": 10,
  "drone_stress_fraction": 0.185,
  "lambda": 0.65
}
```
- **Response**:
```json
{
  "status": "success",
  "s_sat": 0.724,
  "s_drone": 0.617,
  "lambda": 0.65,
  "s_fused": 0.654,
  "risk_score_100": 65.4,
  "risk_category": "CRITICAL",
  "confidence_level": 0.94,
  "actionable_recommendation": "Emergency localized irrigation required. Schedule immediate field-level PMFBY claim filing.",
  "contributing_factors": [
    "NDVI dropped 46.2% below seasonal baseline",
    "Precipitation deficit: 4.2mm rain in 7 days, max temp 35.8°C",
    "High-resolution drone confirmation: 18.5% field area chlorotic"
  ]
}
```

### `POST /api/drone/prioritize`
Screens cadastral holdings across a village or Panchayat, ranks them by urgency, and schedules flights under the 45 fields/day drone capacity limit.
- **Request Body**:
```json
{
  "daily_capacity": 45,
  "min_risk_threshold": 40.0
}
```

---

## 5. Panchayat-Level Surveillance

### `GET /api/panchayat/overview`
Aggregates village-wide surveillance metrics, crop distributions, ranked priority queue, and fleet capacity utilization.
- **Response**:
```json
{
  "status": "success",
  "village": "Khargone West Panchayat",
  "total_farms": 12,
  "total_hectares": 24.3,
  "high_risk_farms_count": 5,
  "drone_fleet_capacity": {
    "daily_limit": 45,
    "allocated_today": 5,
    "utilization_pct": 11.1
  },
  "crop_distribution": {
    "Wheat": 6,
    "Cotton": 4,
    "Soybean": 2
  },
  "flight_queue": [ ... ]
}
```

---

## 6. Proof Packets & Verification

### `POST /api/proof-packets/generate`
Generates a tamper-evident PDF inspection dossier with SHA-256 evidence hash and verification QR code.
- **Request Body**:
```json
{
  "farm_id": 1,
  "analysis_id": 1,
  "claim_crop_type": "Wheat",
  "claim_loss_percent": 42.5,
  "claim_area_hectares": 2.45
}
```
- **Response**:
```json
{
  "id": 1,
  "pdf_url": "/proofs/proof-packet-1741234567.pdf",
  "evidence_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "generated_at": "2026-03-15T10:30:00.000Z"
}
```

### `GET /api/proof-packets/:hash/verify`
Verifies the cryptographic integrity of an uploaded or scanned proof packet against the system ledger.
