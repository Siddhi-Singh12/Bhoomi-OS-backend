"""
Bhoomi Intelligence — Drone Mission Flight Planner
Calculates ground sampling distance (GSD), grid spacing, and generates
survey flight paths over agricultural field boundaries.
"""

import math
from typing import List, Dict, Any, Tuple

DEFAULT_CAMERA = {
    "sensor_width_mm": 13.2,       # DJI 1-inch CMOS sensor
    "sensor_height_mm": 8.8,
    "focal_length_mm": 8.8,
    "image_width_px": 5472,
    "image_height_px": 3648,
    "name": "DJI 20MP RGB Camera (Reference)"
}

def calculate_gsd(altitude_m: float, camera: Dict[str, Any] = None) -> Dict[str, float]:
    """
    Ground Sampling Distance:
    GSD = (SensorWidth_mm * Altitude_m * 100) / (FocalLength_mm * ImageWidth_px) (in cm/pixel)
    """
    cam = camera or DEFAULT_CAMERA
    sw = cam["sensor_width_mm"]
    sh = cam["sensor_height_mm"]
    f = cam["focal_length_mm"]
    w_px = cam["image_width_px"]
    h_px = cam["image_height_px"]

    gsd_h = (sw * altitude_m * 100.0) / (f * w_px) # cm/px
    gsd_v = (sh * altitude_m * 100.0) / (f * h_px) # cm/px
    gsd_avg = (gsd_h + gsd_v) / 2.0

    footprint_w_m = (gsd_h * w_px) / 100.0
    footprint_h_m = (gsd_v * h_px) / 100.0
    footprint_area_sqm = footprint_w_m * footprint_h_m

    return {
        "gsd_cm_per_pixel": round(gsd_avg, 2),
        "footprint_width_m": round(footprint_w_m, 2),
        "footprint_height_m": round(footprint_h_m, 2),
        "footprint_area_sqm": round(footprint_area_sqm, 2),
    }

def point_in_polygon(x: float, y: float, poly: List[List[float]]) -> bool:
    """Ray casting point-in-polygon algorithm."""
    n = len(poly)
    inside = False
    p1x, p1y = poly[0][0], poly[0][1]
    for i in range(n + 1):
        p2x, p2y = poly[i % n][0], poly[i % n][1]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def generate_grid_mission(
    boundary_coordinates: List[List[float]],
    altitude_m: float = 60.0,
    side_overlap_pct: float = 70.0,
    forward_overlap_pct: float = 80.0,
    flight_speed_ms: float = 5.0,
    camera: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Generates a serpentine grid mission over an agricultural field.
    Parameters match official SEVA FIRST innovation specifications:
    - Altitude: 60 m (GSD 1.64 cm/px)
    - Side overlap: 70%
    - Forward overlap: 80%
    """
    ring = boundary_coordinates[0] if isinstance(boundary_coordinates[0][0], list) else boundary_coordinates
    coords = [[float(p[0]), float(p[1])] for p in ring]

    lngs = [p[0] for p in coords]
    lats = [p[1] for p in coords]
    min_lng, max_lng = min(lngs), max(lngs)
    min_lat, max_lat = min(lats), max(lats)
    center_lat = (min_lat + max_lat) / 2.0
    center_lng = (min_lng + max_lng) / 2.0

    # Conversions: 1 deg lat ~ 111,320m, 1 deg lng ~ 111,320m * cos(lat)
    meters_per_deg_lat = 111320.0
    meters_per_deg_lng = 111320.0 * math.cos(math.radians(center_lat))

    optics = calculate_gsd(altitude_m, camera)
    footprint_w = optics["footprint_width_m"]
    footprint_h = optics["footprint_height_m"]

    # Effective step sizes based on overlaps
    line_spacing_m = footprint_w * (1.0 - side_overlap_pct / 100.0)
    shot_spacing_m = footprint_h * (1.0 - forward_overlap_pct / 100.0)

    # In degrees
    line_spacing_deg = line_spacing_m / meters_per_deg_lat
    shot_spacing_deg = shot_spacing_m / meters_per_deg_lng

    # Buffer boundary slightly to ensure 100% perimeter coverage
    lat_pad = (footprint_h * 0.4) / meters_per_deg_lat
    lng_pad = (footprint_w * 0.4) / meters_per_deg_lng

    start_lat = min_lat - lat_pad
    end_lat = max_lat + lat_pad
    start_lng = min_lng - lng_pad
    end_lng = max_lng + lng_pad

    waypoints = []
    flight_lines = []
    lat_cursor = start_lat
    direction = 1 # 1: West -> East, -1: East -> West
    total_distance_m = 0.0
    prev_pt = None

    seq = 1
    while lat_cursor <= end_lat:
        line_points = []
        if direction == 1:
            curr_lng = start_lng
            while curr_lng <= end_lng:
                pt = [round(curr_lng, 6), round(lat_cursor, 6)]
                waypoints.append({
                    "sequence": seq,
                    "latitude": pt[1],
                    "longitude": pt[0],
                    "altitude_m": altitude_m,
                    "action": "PHOTO",
                    "speed_ms": flight_speed_ms
                })
                line_points.append(pt)
                if prev_pt:
                    d_m = math.hypot(
                        (pt[0] - prev_pt[0]) * meters_per_deg_lng,
                        (pt[1] - prev_pt[1]) * meters_per_deg_lat
                    )
                    total_distance_m += d_m
                prev_pt = pt
                seq += 1
                curr_lng += shot_spacing_deg
        else:
            curr_lng = end_lng
            while curr_lng >= start_lng:
                pt = [round(curr_lng, 6), round(lat_cursor, 6)]
                waypoints.append({
                    "sequence": seq,
                    "latitude": pt[1],
                    "longitude": pt[0],
                    "altitude_m": altitude_m,
                    "action": "PHOTO",
                    "speed_ms": flight_speed_ms
                })
                line_points.append(pt)
                if prev_pt:
                    d_m = math.hypot(
                        (pt[0] - prev_pt[0]) * meters_per_deg_lng,
                        (pt[1] - prev_pt[1]) * meters_per_deg_lat
                    )
                    total_distance_m += d_m
                prev_pt = pt
                seq += 1
                curr_lng -= shot_spacing_deg

        flight_lines.append(line_points)
        direction *= -1
        lat_cursor += line_spacing_deg

    flight_time_sec = total_distance_m / max(1.0, flight_speed_ms)
    flight_time_min = round(flight_time_sec / 60.0, 1)

    # Battery estimation: 1 battery = ~20 min survey endurance
    batteries_required = max(1, math.ceil(flight_time_min / 18.0))

    # Construct GeoJSON LineString of flight trajectory
    trajectory_geojson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [[wp["longitude"], wp["latitude"]] for wp in waypoints]
        },
        "properties": {
            "name": f"Flight Path ({altitude_m}m AGL)",
            "total_waypoints": len(waypoints),
            "distance_m": round(total_distance_m, 1),
            "flight_time_min": flight_time_min,
            "gsd_cm": optics["gsd_cm_per_pixel"]
        }
    }

    # QGroundControl standard plan structure
    qgc_plan = {
        "fileType": "Plan",
        "version": 1,
        "groundStation": "Bhoomi Intelligence GCS",
        "mission": {
            "cruiseSpeed": flight_speed_ms,
            "hoverSpeed": 3.0,
            "plannedHomePosition": [center_lat, center_lng, altitude_m],
            "vehicleType": 2, # Multi-rotor
            "items": [
                {
                    "autoContinue": True,
                    "command": 16, # MAV_CMD_NAV_WAYPOINT
                    "frame": 3,    # MAV_FRAME_GLOBAL_RELATIVE_ALT
                    "params": [0, 0, 0, None, wp["latitude"], wp["longitude"], wp["altitude_m"]],
                    "type": "SimpleItem"
                }
                for wp in waypoints
            ]
        }
    }

    return {
        "mission_parameters": {
            "altitude_m": altitude_m,
            "side_overlap_pct": side_overlap_pct,
            "forward_overlap_pct": forward_overlap_pct,
            "speed_ms": flight_speed_ms,
            "line_spacing_m": round(line_spacing_m, 2),
            "shot_spacing_m": round(shot_spacing_m, 2),
            "gsd_cm_per_pixel": optics["gsd_cm_per_pixel"],
            "footprint_width_m": optics["footprint_width_m"],
            "footprint_height_m": optics["footprint_height_m"],
        },
        "mission_metrics": {
            "total_distance_m": round(total_distance_m, 1),
            "estimated_flight_time_min": flight_time_min,
            "estimated_photo_count": len(waypoints),
            "batteries_required": batteries_required,
            "total_flight_lines": len(flight_lines),
        },
        "waypoints": waypoints,
        "trajectory_geojson": trajectory_geojson,
        "qgc_plan_format": qgc_plan
    }
