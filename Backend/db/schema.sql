-- Bhoomi OS — PostgreSQL + PostGIS Schema
-- Run after: CREATE EXTENSION IF NOT EXISTS postgis
CREATE TABLE farmers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    language VARCHAR(30) DEFAULT 'hi',
    agristack_id VARCHAR(50),        -- mocked for MVP
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    crop_type VARCHAR(50),
    area_hectares NUMERIC(10,2),
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,   -- SRID 4326 = standard GPS lat/lng
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_farms_boundary ON farms USING GIST (boundary);

CREATE TABLE analyses (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    ndvi NUMERIC(5,3),
    ndwi NUMERIC(5,3),
    rainfall_mm NUMERIC(6,2),
    temperature_c NUMERIC(5,2),
    stress_type VARCHAR(30),          -- e.g. 'DROUGHT', 'PEST_RISK', 'NONE'
    confidence NUMERIC(4,3),
    rule_triggered VARCHAR(50),       -- e.g. 'DROUGHT_RULE_01'
    analyzed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE proof_packets (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    evidence_hash VARCHAR(128),         -- MVP-level integrity check, not full crypto signing
    claim_crop_type VARCHAR(50),        -- pre-filled from farms.crop_type
    claim_loss_percent NUMERIC(5,2),    -- MVP placeholder, no official PMFBY formula yet
    claim_area_hectares NUMERIC(10,2),  -- pre-filled from farms.area_hectares
    generated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    source_farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    alert_type VARCHAR(30),           -- e.g. 'VILLAGE_LEVEL_DROUGHT'
    radius_km NUMERIC(4,2) DEFAULT 2,
    affected_farm_ids INTEGER[],      -- nearby farms found via PostGIS query
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================================
-- BHOOMI INTELLIGENCE 2.0: DRONE & MULTI-RESOLUTION FUSION SCHEMA EXTENSIONS
-- =========================================================================

CREATE TABLE drone_missions (
    id SERIAL PRIMARY KEY,
    mission_name VARCHAR(150) NOT NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    altitude_m NUMERIC(6,2) DEFAULT 60.0,
    speed_ms NUMERIC(5,2) DEFAULT 5.0,
    side_overlap NUMERIC(4,3) DEFAULT 0.70,
    forward_overlap NUMERIC(4,3) DEFAULT 0.80,
    flight_time_min NUMERIC(6,2),
    distance_m NUMERIC(10,2),
    estimated_photos INTEGER,
    gsd_cm_px NUMERIC(6,3),
    flight_path GEOMETRY(LINESTRING, 4326),
    status VARCHAR(30) DEFAULT 'PLANNED',   -- 'PLANNED', 'IN_FLIGHT', 'COMPLETED', 'FAILED'
    qgc_plan JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drone_missions_flight_path ON drone_missions USING GIST (flight_path);

CREATE TABLE drone_images (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER REFERENCES drone_missions(id) ON DELETE SET NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    exif_gps GEOMETRY(POINT, 4326),
    altitude_agl NUMERIC(6,2),
    capture_timestamp TIMESTAMP,
    camera_model VARCHAR(100),
    quality_score NUMERIC(4,3),
    is_inside_field BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drone_images_exif_gps ON drone_images USING GIST (exif_gps);

CREATE TABLE drone_orthomosaics (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER REFERENCES drone_missions(id) ON DELETE SET NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    raster_path TEXT NOT NULL,
    gsd_cm_px NUMERIC(6,3),
    bounds GEOMETRY(POLYGON, 4326),
    odm_task_id VARCHAR(100),
    processing_status VARCHAR(30) DEFAULT 'COMPLETED', -- 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drone_orthomosaics_bounds ON drone_orthomosaics USING GIST (bounds);

CREATE TABLE drone_cv_analyses (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER REFERENCES drone_missions(id) ON DELETE SET NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    exg_mean NUMERIC(6,4),
    vari_mean NUMERIC(6,4),
    vegetation_coverage_pct NUMERIC(5,2),
    stress_fraction NUMERIC(5,4),
    stress_cluster_count INTEGER DEFAULT 0,
    stress_clusters JSONB,
    scientific_disclaimer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fused_risk_assessments (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    sat_analysis_id INTEGER REFERENCES analyses(id) ON DELETE SET NULL,
    drone_cv_id INTEGER REFERENCES drone_cv_analyses(id) ON DELETE SET NULL,
    s_sat NUMERIC(5,4) NOT NULL,
    s_drone NUMERIC(5,4) NOT NULL,
    lambda NUMERIC(4,3) DEFAULT 0.65,
    s_fused NUMERIC(5,4) NOT NULL,
    risk_level VARCHAR(30) NOT NULL,         -- 'CRITICAL_ACTION_REQUIRED', 'HIGH_RISK', 'MODERATE_MONITOR', 'HEALTHY'
    action_recommendation TEXT NOT NULL,
    explanation TEXT NOT NULL,
    confidence_level VARCHAR(20) DEFAULT 'HIGH',
    assessed_at TIMESTAMP DEFAULT NOW()
);
