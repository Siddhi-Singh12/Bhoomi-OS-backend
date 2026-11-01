const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { calculateCentroid, calculatePolygonAreaHectares } = require('../utils/geoUtils');

const DB_PATH = path.join(__dirname, '../../db/bhoomi_os.sqlite');

let dbInstance = null;

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function parseCoords(geom) {
  if (!geom) return null;
  try {
    const obj = typeof geom === 'string' ? JSON.parse(geom) : geom;
    if (obj.coordinates && obj.coordinates[0]) {
      return obj.coordinates[0];
    }
  } catch (e) {
    return null;
  }
  return null;
}

function getCentroidFromGeom(geom) {
  const coords = parseCoords(geom);
  if (!coords) return { lat: 21.824, lng: 75.615 };
  return calculateCentroid(coords);
}

function getAreaFromGeom(geom) {
  const coords = parseCoords(geom);
  if (!coords) return 2.0;
  return calculatePolygonAreaHectares(coords);
}

function getDatabase() {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);

  // Register custom spatial & compatibility functions
  try {
    db.function('st_asgeojson', (val) => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      return JSON.stringify(val);
    });

    db.function('st_centroid_lat', (geom) => {
      const c = getCentroidFromGeom(geom);
      return c.lat;
    });

    db.function('st_centroid_lng', (geom) => {
      const c = getCentroidFromGeom(geom);
      return c.lng;
    });

    db.function('st_area_ha', (geom) => {
      return getAreaFromGeom(geom);
    });

    db.function('st_distance_m', (geom1, geom2) => {
      const c1 = getCentroidFromGeom(geom1);
      const c2 = getCentroidFromGeom(geom2);
      return haversineDistanceMeters(c1.lat, c1.lng, c2.lat, c2.lng);
    });

    db.function('st_dwithin_m', (geom1, geom2, maxDistMeters) => {
      const c1 = getCentroidFromGeom(geom1);
      const c2 = getCentroidFromGeom(geom2);
      const d = haversineDistanceMeters(c1.lat, c1.lng, c2.lat, c2.lng);
      return d <= maxDistMeters ? 1 : 0;
    });
  } catch (fnErr) {
    logger.debug(`SQLite user-functions registration info: ${fnErr.message}`);
  }

  // Initialize Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS farmers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      language TEXT DEFAULT 'hi',
      agristack_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS farms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id INTEGER NOT NULL,
      crop_type TEXT,
      area_hectares REAL,
      boundary TEXT NOT NULL,
      lat REAL,
      lng REAL,
      location_name TEXT,
      state TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      ndvi REAL,
      ndwi REAL,
      rainfall_mm REAL,
      temperature_c REAL,
      stress_type TEXT,
      confidence REAL,
      rule_triggered TEXT,
      analyzed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proof_packets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      pdf_url TEXT NOT NULL,
      evidence_hash TEXT,
      claim_crop_type TEXT,
      claim_loss_percent REAL,
      claim_area_hectares REAL,
      generated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_farm_id INTEGER NOT NULL,
      alert_type TEXT,
      radius_km REAL DEFAULT 2,
      affected_farm_ids TEXT,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(source_farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );

    -- Bhoomi Intelligence Upgraded Tables
    CREATE TABLE IF NOT EXISTS drone_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mission_name TEXT NOT NULL,
      target_farm_ids TEXT NOT NULL,
      status TEXT DEFAULT 'PLANNED',
      priority_rank INTEGER DEFAULT 1,
      altitude_meters REAL DEFAULT 60.0,
      side_overlap_pct REAL DEFAULT 70.0,
      forward_overlap_pct REAL DEFAULT 80.0,
      planned_flight_path TEXT,
      estimated_duration_min REAL,
      field_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drone_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mission_id INTEGER,
      farm_id INTEGER,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER,
      lat REAL,
      lng REAL,
      altitude_meters REAL,
      exif_metadata TEXT,
      quality_score REAL,
      is_inside_field INTEGER DEFAULT 1,
      captured_at TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drone_orthomosaics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      mission_id INTEGER,
      status TEXT DEFAULT 'COMPLETED',
      orthomosaic_url TEXT,
      cloud_odm_task_id TEXT,
      gsd_cm_per_pixel REAL DEFAULT 1.64,
      total_area_ha REAL,
      processed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drone_cv_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      image_id INTEGER,
      exg_mean REAL,
      vari_mean REAL,
      stress_area_pct REAL,
      green_vegetation_pct REAL,
      soil_background_pct REAL,
      stress_polygons_geojson TEXT,
      anomaly_detected INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0.88,
      analyzed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fused_risk_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      satellite_risk_score REAL,
      drone_risk_score REAL,
      fused_risk_score REAL,
      risk_category TEXT,
      confidence REAL,
      lambda_drone_weight REAL DEFAULT 0.60,
      provenance TEXT,
      explanation TEXT,
      recommendation TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default dataset if empty
  seedInitialData(db);

  dbInstance = db;
  return db;
}

function seedInitialData(db) {
  const farmerCount = db.prepare('SELECT COUNT(*) as count FROM farmers').get().count;
  if (farmerCount > 0) return;

  logger.info('Seeding initial benchmark farmers, cadastral parcels, and alerts into local store...');

  const insertFarmer = db.prepare(`
    INSERT INTO farmers (id, name, phone, language, agristack_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  insertFarmer.run(1, 'Ravi Kumar', '9876543210', 'hi', 'AGR-IND-88219');
  insertFarmer.run(2, 'Sardar Gurdeep Singh', '9812345678', 'pa', 'AGR-PB-44021');
  insertFarmer.run(3, 'Anand Patil', '9420011223', 'mr', 'AGR-MH-99014');
  insertFarmer.run(4, 'Kavitha Reddy', '9948012345', 'te', 'AGR-AP-61308');

  const insertFarm = db.prepare(`
    INSERT INTO farms (id, farmer_id, crop_type, area_hectares, boundary, lat, lng, location_name, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // 1. Khargone, MP (Ravi Kumar - Wheat)
  const f1_coords = [[[75.612, 21.821], [75.618, 21.822], [75.617, 21.828], [75.611, 21.827], [75.612, 21.821]]];
  insertFarm.run(
    1, 1, 'Wheat', 2.35,
    JSON.stringify({ type: 'Polygon', coordinates: f1_coords }),
    21.8245, 75.6145, 'Nimrani, Khargone', 'Madhya Pradesh'
  );

  // Neighbor farm 1 in Nimrani
  const f1_sub1 = [[[75.619, 21.822], [75.625, 21.823], [75.624, 21.829], [75.618, 21.828], [75.619, 21.822]]];
  insertFarm.run(
    2, 1, 'Wheat', 2.10,
    JSON.stringify({ type: 'Polygon', coordinates: f1_sub1 }),
    21.8255, 75.6215, 'Nimrani North, Khargone', 'Madhya Pradesh'
  );

  // Neighbor farm 2 in Nimrani
  const f1_sub2 = [[[75.611, 21.828], [75.617, 21.829], [75.616, 21.835], [75.610, 21.834], [75.611, 21.828]]];
  insertFarm.run(
    3, 1, 'Cotton', 1.85,
    JSON.stringify({ type: 'Polygon', coordinates: f1_sub2 }),
    21.8315, 75.6135, 'Nimrani East, Khargone', 'Madhya Pradesh'
  );

  // 4. Sahnewal, Ludhiana (Gurdeep Singh - Wheat)
  const f2_coords = [[[75.852, 30.901], [75.861, 30.903], [75.859, 30.912], [75.848, 30.909], [75.852, 30.901]]];
  insertFarm.run(
    6, 2, 'Wheat', 4.80,
    JSON.stringify({ type: 'Polygon', coordinates: f2_coords }),
    30.9064, 75.8550, 'Sahnewal, Ludhiana', 'Punjab'
  );

  // 5. Pusad, Yavatmal (Anand Patil - Cotton)
  const f3_coords = [[[78.121, 20.392], [78.132, 20.395], [78.129, 20.404], [78.118, 20.401], [78.121, 20.392]]];
  insertFarm.run(
    11, 3, 'Cotton', 3.12,
    JSON.stringify({ type: 'Polygon', coordinates: f3_coords }),
    20.3980, 78.1250, 'Pusad, Yavatmal', 'Maharashtra'
  );

  // Initial Analysis
  const insertAnalysis = db.prepare(`
    INSERT INTO analyses (id, farm_id, ndvi, ndwi, rainfall_mm, temperature_c, stress_type, confidence, rule_triggered, analyzed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))
  `);
  insertAnalysis.run(1, 1, 0.22, 0.05, 4.0, 39.0, 'DROUGHT', 0.95, 'R1_drought_ndvi_rainfall');
  insertAnalysis.run(2, 6, 0.48, 0.24, 28.5, 31.0, 'NONE', 0.88, 'R0_baseline');

  // Initial Proof Packet
  const insertProof = db.prepare(`
    INSERT INTO proof_packets (id, analysis_id, pdf_url, evidence_hash, claim_crop_type, claim_loss_percent, claim_area_hectares, generated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))
  `);
  insertProof.run(
    1, 1, '/proofs/proof-packet-1-1725514800000.pdf',
    '0x87ef4a2b910c6674f28e2190847291a1820982348a88192a83e098192a889102',
    'Wheat', 40.0, 2.35
  );

  // Initial Alerts
  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, source_farm_id, alert_type, radius_km, affected_farm_ids, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))
  `);
  insertAlert.run(
    1, 1, 'VILLAGE_LEVEL_DROUGHT', 2.0,
    JSON.stringify([2, 3]),
    'Drought calamity detected on farm #1 (Wheat). 2 neighboring holding(s) within 2km may be affected.'
  );

  logger.info('Database seeded successfully.');
}

/**
 * Universal query runner: translates PostGIS / Postgres SQL to SQLite
 */
function runSqliteQuery(sqlText, params = []) {
  const db = getDatabase();
  let cleanSql = sqlText.trim();
  const safeParams = (params || []).map((p) => (p === undefined ? null : p));

  // Normalize parameters: $1, $2 -> ?
  cleanSql = cleanSql.replace(/\$(\d+)/g, '?');

  // Normalize PostGIS functions to registered SQLite user functions
  cleanSql = cleanSql.replace(/ST_AsGeoJSON\s*\(\s*([^)]+)\s*\)/gi, 'st_asgeojson($1)');
  cleanSql = cleanSql.replace(/ROUND\s*\(\s*ST_Y\s*\(\s*ST_Centroid\s*\(\s*([^)]+)\s*\)\s*\)\s*::numeric\s*,\s*\d+\s*\)/gi, 'st_centroid_lat($1)');
  cleanSql = cleanSql.replace(/ROUND\s*\(\s*ST_X\s*\(\s*ST_Centroid\s*\(\s*([^)]+)\s*\)\s*\)\s*::numeric\s*,\s*\d+\s*\)/gi, 'st_centroid_lng($1)');
  cleanSql = cleanSql.replace(/ST_Y\s*\(\s*ST_Centroid\s*\(\s*([^)]+)\s*\)\s*\)/gi, 'st_centroid_lat($1)');
  cleanSql = cleanSql.replace(/ST_X\s*\(\s*ST_Centroid\s*\(\s*([^)]+)\s*\)\s*\)/gi, 'st_centroid_lng($1)');
  cleanSql = cleanSql.replace(/ROUND\s*\(\s*\(?\s*ST_Area\s*\([^)]+\)\s*\/\s*10000\s*\)?\s*::numeric\s*,\s*\d+\s*\)/gi, 'st_area_ha($1)');
  cleanSql = cleanSql.replace(/ST_SetSRID\s*\(\s*ST_GeomFromGeoJSON\s*\(\s*\?\s*\)\s*,\s*4326\s*\)/gi, '?');
  cleanSql = cleanSql.replace(/ST_GeomFromGeoJSON\s*\(\s*\?\s*\)/gi, '?');
  cleanSql = cleanSql.replace(/::geography/gi, '');
  cleanSql = cleanSql.replace(/::numeric/gi, '');
  cleanSql = cleanSql.replace(/NOW\(\)/gi, "datetime('now')");
  cleanSql = cleanSql.replace(/ILIKE/gi, 'LIKE');

  // Handle DWithin spatial queries
  if (/ST_DWithin/i.test(cleanSql)) {
    // Specialized handler for nearby farms
    return handleNearbyFarmsQuery(cleanSql, params);
  }

  // Handle INSERT with RETURNING
  const isInsert = /^INSERT\s+INTO/i.test(cleanSql);
  if (isInsert) {
    const hasReturning = /RETURNING\s+(.+)$/i.test(cleanSql);
    let returningClause = '*';
    if (hasReturning) {
      returningClause = cleanSql.match(/RETURNING\s+(.+)$/i)[1].trim();
      cleanSql = cleanSql.replace(/RETURNING\s+.+$/i, '').trim();
    }

    // Extract table name
    const matchTable = cleanSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
    const tableName = matchTable ? matchTable[1] : '';

    // Handle farm insertion geometry and coordinate calculation
    if (tableName === 'farms') {
      return handleFarmInsert(safeParams);
    }

    // Handle alert insertion affected_farm_ids JSON serialization
    if (tableName === 'alerts') {
      return handleAlertInsert(safeParams);
    }

    try {
      const stmt = db.prepare(cleanSql);
      const info = stmt.run(...safeParams);
      const insertedId = info.lastInsertRowid;
      const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(insertedId);
      return { rows: row ? [row] : [], rowCount: 1 };
    } catch (insertErr) {
      logger.error(`SQLite INSERT failed: ${insertErr.message} | SQL: ${cleanSql}`);
      throw insertErr;
    }
  }

  try {
    const stmt = db.prepare(cleanSql);
    const rows = stmt.all(...safeParams);
    return { rows: rows || [], rowCount: (rows || []).length };
  } catch (err) {
    logger.error(`SQLite query error: ${err.message} | CleanSQL: ${cleanSql}`);
    throw err;
  }
}

function handleFarmInsert(params) {
  const db = getDatabase();
  const farmerId = params[0];
  const cropType = params[1] || 'Unknown';
  let boundaryStr = params[2];
  if (typeof boundaryStr !== 'string') {
    boundaryStr = JSON.stringify(boundaryStr);
  }

  const c = getCentroidFromGeom(boundaryStr);
  const area = getAreaFromGeom(boundaryStr);

  const stmt = db.prepare(`
    INSERT INTO farms (farmer_id, crop_type, area_hectares, boundary, lat, lng, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const info = stmt.run(farmerId, cropType, area, boundaryStr, c.lat, c.lng);
  const inserted = db.prepare('SELECT * FROM farms WHERE id = ?').get(info.lastInsertRowid);
  return { rows: [inserted], rowCount: 1 };
}

function handleAlertInsert(params) {
  const db = getDatabase();
  const sourceFarmId = params[0];
  const alertType = params[1];
  const radiusKm = params[2] || 2;
  let affectedIds = params[3] || [];
  if (Array.isArray(affectedIds)) {
    affectedIds = JSON.stringify(affectedIds);
  }
  const message = params[4] || '';

  const stmt = db.prepare(`
    INSERT INTO alerts (source_farm_id, alert_type, radius_km, affected_farm_ids, message, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const info = stmt.run(sourceFarmId, alertType, radiusKm, affectedIds, message);
  const inserted = db.prepare('SELECT * FROM alerts WHERE id = ?').get(info.lastInsertRowid);
  return { rows: [inserted], rowCount: 1 };
}

function handleNearbyFarmsQuery(cleanSql, params) {
  const db = getDatabase();
  const sourceFarmId = params[0];
  const radiusKm = params[1] || 2;
  const maxDistanceMeters = radiusKm * 1000;

  const sourceFarm = db.prepare('SELECT * FROM farms WHERE id = ?').get(sourceFarmId);
  if (!sourceFarm) {
    return { rows: [], rowCount: 0 };
  }

  const sCentroid = {
    lat: sourceFarm.lat || getCentroidFromGeom(sourceFarm.boundary).lat,
    lng: sourceFarm.lng || getCentroidFromGeom(sourceFarm.boundary).lng,
  };

  const allFarms = db.prepare(`
    SELECT 
      f.id,
      f.farmer_id,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id,
      f.crop_type,
      f.area_hectares,
      f.boundary,
      f.lat,
      f.lng
    FROM farms f
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    WHERE f.id != ?
  `).all(sourceFarmId);

  const matched = [];
  for (const f of allFarms) {
    const fCentroid = {
      lat: f.lat || getCentroidFromGeom(f.boundary).lat,
      lng: f.lng || getCentroidFromGeom(f.boundary).lng,
    };
    const dist = haversineDistanceMeters(sCentroid.lat, sCentroid.lng, fCentroid.lat, fCentroid.lng);
    if (dist <= maxDistanceMeters) {
      matched.push({
        id: f.id,
        farmer_id: f.farmer_id,
        farmer_name: f.farmer_name,
        farmer_phone: f.farmer_phone,
        agristack_id: f.agristack_id,
        crop_type: f.crop_type,
        area_hectares: f.area_hectares,
        boundary: f.boundary,
        lat: fCentroid.lat,
        lng: fCentroid.lng,
        distance_meters: dist,
      });
    }
  }

  matched.sort((a, b) => a.distance_meters - b.distance_meters);

  // If query only asked for IDs
  if (/SELECT\s+id\s+FROM\s+farms/i.test(cleanSql)) {
    return { rows: matched.map((m) => ({ id: m.id })), rowCount: matched.length };
  }

  return { rows: matched, rowCount: matched.length };
}

module.exports = {
  getDatabase,
  runSqliteQuery,
  haversineDistanceMeters,
  getCentroidFromGeom,
  getAreaFromGeom,
};
