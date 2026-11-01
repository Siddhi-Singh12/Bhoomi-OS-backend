"""
Bhoomi Intelligence — Intelligent Drone Inspection Prioritisation Engine
Screens all registered cadastral holdings using satellite anomalies, ranks by urgency,
and schedules drone inspection missions under a configurable daily flight capacity.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

DEFAULT_DAILY_DRONE_CAPACITY = 45 # Baseline planning assumption: ~45 fields/day (approx 49 ha/day across 3 batteries)

def rank_and_schedule_fields(
    fields: List[Dict[str, Any]],
    daily_capacity: int = DEFAULT_DAILY_DRONE_CAPACITY,
    min_risk_threshold: float = 40.0
) -> Dict[str, Any]:
    """
    Screens registered fields and ranks them for targeted drone deployment.
    """
    total_fields = len(fields)

    scored_fields = []
    for f in fields:
        # Extract satellite indicators
        ndvi = float(f.get("ndvi", 0.45) or 0.45)
        ndwi = float(f.get("ndwi", 0.15) or 0.15)
        rain_7d = float(f.get("rainfall_mm", 20.0) or 20.0)
        temp_c = float(f.get("temperature_c", 30.0) or 30.0)
        persistence = int(f.get("persistence_days", 5) or 5)

        # Baseline expected NDVI for crop type
        crop = f.get("crop_type", "Wheat")
        baseline_ndvi = 0.52 if crop == "Wheat" else 0.48

        # Calculate satellite screening score
        from ai_engine.fusion_engine import compute_fused_risk
        fusion = compute_fused_risk(
            ndvi=ndvi,
            ndwi=ndwi,
            baseline_ndvi=baseline_ndvi,
            rainfall_7d_mm=rain_7d,
            avg_temp_c=temp_c,
            persistence_days=persistence,
            drone_data=f.get("drone_data"),
            crop_type=crop
        )

        score = fusion["fused_risk_score"]
        status = f.get("inspection_status", "PENDING_INSPECTION")
        has_drone_data = bool(f.get("drone_data"))

        scored_fields.append({
            "field_id": f.get("id") or f.get("field_id"),
            "farmer_name": f.get("farmer_name", "Farmer"),
            "agristack_id": f.get("agristack_id", "AGR-IND"),
            "crop_type": crop,
            "area_hectares": float(f.get("area_hectares", 2.0) or 2.0),
            "centroid": f.get("centroid", {"lat": 21.824, "lng": 75.615}),
            "satellite_ndvi": ndvi,
            "satellite_ndwi": ndwi,
            "rainfall_7d_mm": rain_7d,
            "temperature_c": temp_c,
            "satellite_risk_score": fusion["satellite_risk_score"],
            "drone_risk_score": fusion["drone_risk_score"],
            "fused_risk_score": score,
            "risk_category": fusion["risk_category"],
            "contributing_factors": fusion["contributing_factors"],
            "actionable_recommendation": fusion["actionable_recommendation"],
            "inspection_status": "INSPECTED" if has_drone_data else status,
            "priority_score": score * (1.2 if crop in ["Wheat", "Rice"] else 1.0),
            "flagged_for_drone": bool(score >= min_risk_threshold),
            "has_drone_data": has_drone_data,
        })

    # Sort descending by priority score
    scored_fields.sort(key=lambda x: x["priority_score"], reverse=True)

    # Assign rank
    for idx, item in enumerate(scored_fields):
        item["priority_rank"] = idx + 1

    # Capacity allocation
    scheduled_for_today = []
    scheduled_for_next_batch = []
    healthy_monitoring_only = []

    high_risk_count = 0
    inspected_count = 0
    awaiting_count = 0

    capacity_remaining = daily_capacity

    for item in scored_fields:
        if item["has_drone_data"] or item["inspection_status"] == "INSPECTED":
            inspected_count += 1
        elif item["flagged_for_drone"]:
            awaiting_count += 1
            if capacity_remaining > 0:
                scheduled_for_today.append(item)
                capacity_remaining -= 1
            else:
                scheduled_for_next_batch.append(item)

        if item["fused_risk_score"] >= 60.0:
            high_risk_count += 1

        if not item["flagged_for_drone"]:
            healthy_monitoring_only.append(item)

    capacity_utilization_pct = round(((daily_capacity - capacity_remaining) / max(1, daily_capacity)) * 100, 1)

    return {
        "summary": {
            "total_registered_fields": total_fields,
            "high_risk_fields": high_risk_count,
            "fields_awaiting_inspection": awaiting_count,
            "fields_inspected": inspected_count,
            "daily_drone_capacity": daily_capacity,
            "allocated_today_count": len(scheduled_for_today),
            "capacity_utilization_pct": capacity_utilization_pct,
            "backlog_count": len(scheduled_for_next_batch),
        },
        "mission_queue": {
            "scheduled_today": scheduled_for_today,
            "deferred_next_flight_window": scheduled_for_next_batch,
            "routine_satellite_monitoring": healthy_monitoring_only,
        },
        "ranked_field_catalog": scored_fields
    }
