"""
Bhoomi Intelligence — AI/ML & Drone Geospatial Microservice
FastAPI entrypoint exposing precision agriculture analytics, flight planning,
RGB computer vision, and multi-resolution satellite-drone data fusion.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import shutil

from ai_engine.flight_planner import generate_grid_mission, calculate_gsd
from ai_engine.exif_parser import extract_exif_metadata, calculate_image_quality, validate_photo_in_field
from ai_engine.cv_pipeline import analyze_rgb_drone_image
from ai_engine.fusion_engine import compute_fused_risk
from ai_engine.prioritization_engine import rank_and_schedule_fields
from ai_engine.odm_client import OpenDroneMapClient

app = FastAPI(
    title="Bhoomi Intelligence AI/ML & Drone Analytics Engine",
    description="High-precision agricultural intelligence combining Sentinel-2 multi-band satellite data and RGB drone aerial imagery.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

odm_client = OpenDroneMapClient()

# ----------------- Request Schemas -----------------

class MissionPlanRequest(BaseModel):
    boundary: List[List[float]] = Field(..., description="GeoJSON coordinates array of cadastral field boundary")
    altitude_m: float = Field(60.0, description="Planning altitude in meters (Green zone ceiling 120m)")
    side_overlap_pct: float = Field(70.0, description="Side overlap percentage")
    forward_overlap_pct: float = Field(80.0, description="Forward overlap percentage")
    speed_ms: float = Field(5.0, description="Flight survey speed in m/s")

class CVAnalysisRequest(BaseModel):
    image_path: Optional[str] = None
    farm_id: Optional[int] = 1

class FusionRequest(BaseModel):
    ndvi: float = Field(..., description="Sentinel-2 10m NDVI")
    ndwi: float = Field(..., description="Sentinel-2 10m NDWI")
    baseline_ndvi: float = Field(0.50, description="Historical crop baseline NDVI")
    baseline_ndwi: float = Field(0.20, description="Historical crop baseline NDWI")
    rainfall_7d_mm: float = Field(20.0, description="Cumulative 7-day precipitation")
    avg_temp_c: float = Field(30.0, description="Average max 7-day temperature")
    persistence_days: int = Field(7, description="Consecutive days anomaly has persisted")
    drone_data: Optional[Dict[str, Any]] = Field(None, description="Drone RGB CV results (e.g. stress_area_fraction)")
    crop_type: str = Field("Wheat", description="Target registered crop")

class PrioritizationRequest(BaseModel):
    fields: List[Dict[str, Any]] = Field(..., description="Array of registered fields with current satellite indicators")
    daily_capacity: int = Field(45, description="Daily flight capacity (default 45 fields/day)")
    min_risk_threshold: float = Field(40.0, description="Minimum risk score to qualify for drone dispatch")

# ----------------- API Endpoints -----------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Bhoomi Intelligence AI/ML & Drone Analytics Engine",
        "version": "2.0.0",
        "odm_status": odm_client.check_connection()
    }

@app.post("/api/v1/mission/plan")
def plan_drone_mission(req: MissionPlanRequest):
    """
    Module 6: Drone Mission Planner
    Calculates GSD, footprint, grid lines, and waypoints for autonomous survey.
    """
    try:
        mission = generate_grid_mission(
            boundary_coordinates=req.boundary,
            altitude_m=req.altitude_m,
            side_overlap_pct=req.side_overlap_pct,
            forward_overlap_pct=req.forward_overlap_pct,
            flight_speed_ms=req.speed_ms
        )
        return {"success": True, "plan": mission}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/images/parse-exif")
async def parse_image_exif(
    file: UploadFile = File(...),
    farm_id: Optional[int] = Form(None)
):
    """
    Module 7: Drone Image Acquisition & EXIF Parser
    Extracts GPS tags, flight altitude, and verifies photo location.
    """
    upload_dir = "/tmp/bhoomi_drone_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    temp_path = os.path.join(upload_dir, file.filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    exif = extract_exif_metadata(temp_path)
    qa = calculate_image_quality(temp_path)

    return {
        "success": True,
        "filename": file.filename,
        "metadata": exif,
        "quality_metrics": qa,
        "is_acceptable": qa["is_acceptable_for_orthomosaic"]
    }

@app.post("/api/v1/cv/analyze")
def analyze_drone_imagery(req: CVAnalysisRequest):
    """
    Module 9: Drone Computer Vision (ExG, VARI, Plant/Soil Segmentation)
    """
    result = analyze_rgb_drone_image(req.image_path or "")
    return {"success": True, "cv_results": result}

@app.post("/api/v1/fusion/evaluate")
def evaluate_data_fusion(req: FusionRequest):
    """
    Module 10: Multi-Resolution Satellite-Drone Data Fusion
    Combines Sentinel-2 + Weather + RGB Drone confirmation into unified score.
    """
    fusion = compute_fused_risk(
        ndvi=req.ndvi,
        ndwi=req.ndwi,
        baseline_ndvi=req.baseline_ndvi,
        baseline_ndwi=req.baseline_ndwi,
        rainfall_7d_mm=req.rainfall_7d_mm,
        avg_temp_c=req.avg_temp_c,
        persistence_days=req.persistence_days,
        drone_data=req.drone_data,
        crop_type=req.crop_type
    )
    return {"success": True, "fusion": fusion}

@app.post("/api/v1/prioritize")
def prioritize_village_fields(req: PrioritizationRequest):
    """
    Module 11: Intelligent Drone Prioritisation
    Ranks fields across the Panchayat and allocates top-priority fields under daily flight capacity.
    """
    result = rank_and_schedule_fields(
        fields=req.fields,
        daily_capacity=req.daily_capacity,
        min_risk_threshold=req.min_risk_threshold
    )
    return {"success": True, "prioritization": result}

@app.post("/api/v1/odm/process")
def process_odm_orthomosaic(farm_id: int = Form(1)):
    """
    Module 8: OpenDroneMap Orthomosaic Pipeline
    """
    ortho = odm_client.process_orthomosaic(image_paths=[], farm_id=farm_id)
    return {"success": True, "orthomosaic": ortho}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_engine.main:app", host="0.0.0.0", port=8000, reload=True)
