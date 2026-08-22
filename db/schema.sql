Create Table farmers(
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    language VARCHAR(30) DEFAULT 'hi',
    agristack_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()

);

CREATE TABLE farms(
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER NOT NULL REFERENCES farmers(id)   ON DELETE CASCADE,
    crop_type VARCHAR(50),
    area_hectares NUMERIC(10,2),
    boundary GEOMETRY(POLYGON,4326) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_farms_boundary  ON farms USING GIST(boundary);

/*analyses*/
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
    evidence_hash VARCHAR(128),
    claim_crop_type VARCHAR(50),        -- pre-filled from farms.crop_type
    claim_loss_percent NUMERIC(5,2),    -- MVP placeholder, no official formula yet
    claim_area_hectares NUMERIC(10,2),  -- pre-filled from farms.area_hectares
    generated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    source_farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    alert_type VARCHAR(30),           -- e.g. 'VILLAGE_LEVEL_DROUGHT'
    radius_km NUMERIC(4,2) DEFAULT 2,
    affected_farm_ids INTEGER[],      -- Postgres array — nearby farms found
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);