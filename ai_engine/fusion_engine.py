"""
Bhoomi Intelligence — Multi-Resolution Satellite-Drone Data Fusion Engine
Implements the unified field-level risk formulation from Slide 18 of the SEVA FIRST Innovation Proposal:

S_sat   = 0.40 * Z_NDVI + 0.25 * Z_NDWI + 0.20 * W + 0.15 * P
S_drone = min(1.0, f_stress / 0.30)
S_fused = (1 - lambda) * S_sat + lambda * S_drone

Where:
- Z_NDVI: Normalized vegetation anomaly (drop below historical baseline, [0, 1])
- Z_NDWI: Normalized canopy water / moisture anomaly ([0, 1])
- W: Weather stress factor (precipitation deficit + thermal anomaly, [0, 1])
- P: Anomaly persistence factor (consecutive days of flagged anomaly, [0, 1])
- f_stress: Area fraction of field exhibiting high vegetative stress in drone imagery
- lambda: Weight of drone evidence (default 0.60 when drone imagery exists; 0.0 when satellite-only)
"""

from typing import Dict, Any, Optional, List
from datetime import datetime

DEFAULT_WEIGHTS = {
    "w_ndvi": 0.40,
    "w_ndwi": 0.25,
    "w_weather": 0.20,
    "w_persistence": 0.15,
    "drone_lambda": 0.60,
    "drone_saturation_threshold": 0.30, # 30% affected area maps to S_drone = 1.0
}

def normalize_z_score(actual: float, baseline: float, inverted: bool = True) -> float:
    """
    Normalizes index anomaly to [0.0, 1.0].
    If inverted=True (e.g. NDVI), a drop below baseline increases risk.
    """
    if actual is None or baseline is None:
        return 0.50 # Neutral default

    delta = baseline - actual if inverted else actual - baseline
    # Assume 0.35 drop represents maximum anomaly (1.0)
    norm = delta / 0.35
    return max(0.0, min(1.0, norm))

def calculate_weather_stress(rainfall_7d_mm: float, avg_temp_c: float, crop_type: str = "Wheat") -> float:
    """
    Computes normalized weather stress W in [0.0, 1.0] from rainfall deficit and heat.
    """
    rain = 20.0 if rainfall_7d_mm is None else float(rainfall_7d_mm)
    temp = 30.0 if avg_temp_c is None else float(avg_temp_c)

    # Precipitation deficit: < 5mm is acute (1.0), > 40mm is optimal (0.0)
    rain_stress = max(0.0, min(1.0, (40.0 - rain) / 35.0))

    # Thermal stress: > 38°C is severe (1.0), < 28°C is low (0.0)
    heat_stress = max(0.0, min(1.0, (temp - 28.0) / 12.0))

    return round(0.60 * rain_stress + 0.40 * heat_stress, 3)

def calculate_persistence_factor(consecutive_days_flagged: int) -> float:
    """
    Computes persistence factor P in [0.0, 1.0].
    Single-pass transient drops score lower; persistence > 14 days reaches 1.0.
    """
    days = max(0, int(consecutive_days_flagged or 0))
    return round(min(1.0, days / 14.0), 3)

def compute_fused_risk(
    # Satellite inputs
    ndvi: float,
    ndwi: float,
    baseline_ndvi: float = 0.50,
    baseline_ndwi: float = 0.20,
    rainfall_7d_mm: float = 20.0,
    avg_temp_c: float = 30.0,
    persistence_days: int = 7,
    # Drone inputs (optional)
    drone_data: Optional[Dict[str, Any]] = None,
    # Custom config
    custom_weights: Optional[Dict[str, float]] = None,
    crop_type: str = "Wheat"
) -> Dict[str, Any]:
    """
    Computes complete multi-resolution risk fusion with provenance tracking.
    """
    weights = dict(DEFAULT_WEIGHTS)
    if custom_weights:
        weights.update(custom_weights)

    # 1. Satellite Sub-Score Components
    z_ndvi = normalize_z_score(ndvi, baseline_ndvi, inverted=True)
    z_ndwi = normalize_z_score(ndwi, baseline_ndwi, inverted=True)
    w_stress = calculate_weather_stress(rainfall_7d_mm, avg_temp_c, crop_type)
    p_factor = calculate_persistence_factor(persistence_days)

    s_sat = (
        weights["w_ndvi"] * z_ndvi +
        weights["w_ndwi"] * z_ndwi +
        weights["w_weather"] * w_stress +
        weights["w_persistence"] * p_factor
    )
    s_sat = max(0.0, min(1.0, s_sat))

    # 2. Drone Sub-Score Components
    has_valid_drone = bool(drone_data and "stress_area_fraction" in drone_data)
    if has_valid_drone:
        f_stress = float(drone_data["stress_area_fraction"])
        sat_threshold = weights["drone_saturation_threshold"]
        s_drone = min(1.0, f_stress / sat_threshold)
        effective_lambda = weights["drone_lambda"]
    else:
        f_stress = 0.0
        s_drone = 0.0
        effective_lambda = 0.0 # Reverts purely to satellite screening

    # 3. Fused Calculation
    s_fused = (1.0 - effective_lambda) * s_sat + effective_lambda * s_drone
    s_fused = max(0.0, min(1.0, s_fused))

    # Scale to standard 0-100 agricultural risk index
    scaled_sat_risk = round(s_sat * 100.0, 1)
    scaled_drone_risk = round(s_drone * 100.0, 1) if has_valid_drone else None
    scaled_fused_risk = round(s_fused * 100.0, 1)

    # Risk Categorization
    if scaled_fused_risk >= 75.0:
        category = "CRITICAL"
        action_urgency = "IMMEDIATE_ACTION_REQUIRED"
    elif scaled_fused_risk >= 50.0:
        category = "HIGH"
        action_urgency = "FIELD_INSPECTION_RECOMMENDED"
    elif scaled_fused_risk >= 30.0:
        category = "MEDIUM"
        action_urgency = "ROUTINE_MONITORING"
    else:
        category = "LOW"
        action_urgency = "HEALTHY_CONDITIONS"

    # Explanation and Factor Contribution
    contributing_factors = []
    if z_ndvi > 0.4:
        drop_pct = round((baseline_ndvi - ndvi) / baseline_ndvi * 100, 1)
        contributing_factors.append(f"Vegetation anomaly: NDVI dropped {drop_pct}% below expected baseline")
    if z_ndwi > 0.4:
        contributing_factors.append("Canopy water desiccation: NDWI indicates severe moisture deficit")
    if w_stress > 0.5:
        contributing_factors.append(f"Meteorological stress: {rainfall_7d_mm}mm rainfall in 7 days, max temp {avg_temp_c}°C")
    if p_factor > 0.5:
        contributing_factors.append(f"Persistence: Anomaly persisted across {persistence_days} days")
    if has_valid_drone and f_stress > 0.05:
        contributing_factors.append(f"High-resolution drone confirmation: {round(f_stress*100, 1)}% of field area confirmed stressed via RGB CV")

    # Agronomic Action Recommendation
    if category in ["CRITICAL", "HIGH"]:
        if z_ndwi > 0.4 and w_stress > 0.5:
            rec = "Prioritise emergency localized irrigation or mulching. File verified PMFBY proof packet for drought calamity consideration."
        elif z_ndvi > 0.5 and z_ndwi < 0.3:
            rec = "Foliar pest or fungal infestation suspected. Dispatch agricultural extension scout to inspect indicated high-resolution stress zones."
        else:
            rec = "Verify drainage channels and crop root-zone health. Review nutrient application."
    else:
        rec = "Crop health is currently optimal. Maintain standard seasonal fertigation schedule."

    # Confidence calculation: satellite-only = 0.78, satellite + weather = 0.86, satellite + drone = 0.94
    confidence = 0.94 if has_valid_drone else (0.86 if rainfall_7d_mm is not None else 0.76)

    return {
        "fused_risk_score": scaled_fused_risk,
        "satellite_risk_score": scaled_sat_risk,
        "drone_risk_score": scaled_drone_risk,
        "risk_category": category,
        "action_urgency": action_urgency,
        "confidence_level": confidence,
        "fusion_parameters": {
            "lambda_drone_weight": effective_lambda,
            "weights_used": weights,
            "inputs_normalized": {
                "Z_ndvi": round(z_ndvi, 3),
                "Z_ndwi": round(z_ndwi, 3),
                "W_weather": round(w_stress, 3),
                "P_persistence": round(p_factor, 3),
                "f_stress_drone": round(f_stress, 3)
            }
        },
        "contributing_factors": contributing_factors,
        "actionable_recommendation": rec,
        "provenance": {
            "satellite_sensor": "Sentinel-2 MSI Level-2A (10m)",
            "drone_sensor": "RGB Optical UAV (1-3cm GSD)" if has_valid_drone else "NO_DRONE_DATA_ACQUIRED",
            "weather_source": "Open-Meteo & Climatology Feed",
            "calculated_at": datetime.utcnow().isoformat() + "Z"
        }
    }
