import React from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, TrendingDown, CloudRain, Thermometer, Info } from "lucide-react";

export default function AIRiskScoreCard({ analysis, farm }) {
  if (!analysis) return null;

  const stressType = (analysis.stress_type || "NONE").toUpperCase();
  const confidence = analysis.confidence != null ? Number(analysis.confidence) : 0.75;
  const ndvi = analysis.ndvi != null ? Number(analysis.ndvi) : null;
  const rainfallMm = analysis.rainfall_mm != null ? Number(analysis.rainfall_mm) : null;
  const tempC = analysis.temperature_c != null ? Number(analysis.temperature_c) : null;

  // Use risk score from backend if provided, or compute deterministically
  let riskScore = analysis.risk_score;
  let riskLevel = analysis.risk_level;

  if (riskScore == null) {
    if (stressType === "DROUGHT") {
      const confFactor = confidence * 25;
      let ndviFactor = 20;
      if (ndvi != null) {
        ndviFactor = Math.min(25, Math.max(0, ((0.5 - ndvi) / 0.5) * 30));
      }
      let rainFactor = 10;
      if (rainfallMm != null && rainfallMm < 10) {
        rainFactor = Math.min(15, ((10 - rainfallMm) / 10) * 15);
      }
      riskScore = Math.round(40 + confFactor + ndviFactor + rainFactor);
      riskScore = Math.min(98, Math.max(72, riskScore));
      riskLevel = "HIGH";
    } else if (stressType === "PEST_RISK") {
      const confFactor = confidence * 25;
      let ndviFactor = 15;
      if (ndvi != null) {
        ndviFactor = Math.min(20, Math.max(0, ((0.5 - ndvi) / 0.5) * 25));
      }
      riskScore = Math.round(30 + confFactor + ndviFactor);
      riskScore = Math.min(74, Math.max(50, riskScore));
      riskLevel = "MEDIUM";
    } else {
      riskScore = Math.round(Math.max(8, Math.min(28, (0.5 - (ndvi || 0.45)) * 30 + 12)));
      riskLevel = "LOW";
    }
  }

  // Visual theming based on score
  const isHigh = riskScore >= 70;
  const isMedium = riskScore >= 35 && riskScore < 70;

  const config = isHigh
    ? {
        border: "border-red-300",
        badgeBg: "bg-red-100 text-red-800 border-red-200",
        trackColor: "stroke-red-600",
        label: "CRITICAL RISK",
        sublabel: "Immediate PMFBY Claim Evidence Required",
        icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
      }
    : isMedium
    ? {
        border: "border-amber-300",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
        trackColor: "stroke-amber-500",
        label: "MODERATE RISK",
        sublabel: "Watchlist: Vegetative Anomaly Detected",
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      }
    : {
        border: "border-emerald-300",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
        trackColor: "stroke-emerald-600",
        label: "LOW RISK",
        sublabel: "Normal Biophysical Canopy Vigor",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      };

  // Compile "Why this farm is flagged" rationales
  const flagReasons = [];

  if (ndvi != null) {
    if (ndvi < 0.35) {
      const dropPct = Math.round(((0.50 - ndvi) / 0.50) * 100);
      flagReasons.push({
        title: "Severe Canopy Degradation (NDVI)",
        detail: `Sentinel-2 NDVI registered at ${ndvi.toFixed(2)} — a ${dropPct}% drop below the expected healthy canopy baseline of 0.50.`,
        severity: "critical",
        icon: <TrendingDown className="w-4 h-4 text-red-500" />,
      });
    } else if (ndvi < 0.45) {
      flagReasons.push({
        title: "Mild Vegetative Deficit",
        detail: `NDVI is ${ndvi.toFixed(2)}, slightly beneath normal seasonal greenness.`,
        severity: "warning",
        icon: <TrendingDown className="w-4 h-4 text-amber-500" />,
      });
    } else {
      flagReasons.push({
        title: "Optimal Photosynthetic Activity",
        detail: `NDVI index at ${ndvi.toFixed(2)} confirms healthy chlorophyll absorption.`,
        severity: "normal",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    }
  }

  if (rainfallMm != null) {
    if (rainfallMm < 10) {
      flagReasons.push({
        title: "Acute Precipitation Deficit",
        detail: `Only ${rainfallMm.toFixed(1)} mm rainfall recorded over the past 7 days (PMFBY drought stress threshold: < 10.0 mm).`,
        severity: "critical",
        icon: <CloudRain className="w-4 h-4 text-red-500" />,
      });
    } else {
      flagReasons.push({
        title: "Recent Rainfall Received",
        detail: `${rainfallMm.toFixed(1)} mm precipitation logged over the past 7 days.`,
        severity: "normal",
        icon: <CloudRain className="w-4 h-4 text-blue-500" />,
      });
    }
  }

  if (tempC != null && tempC > 35) {
    flagReasons.push({
      title: "Thermal Desiccation Stress",
      detail: `Average maximum temperature reached ${tempC.toFixed(1)}°C, intensifying vegetative moisture loss.`,
      severity: "warning",
      icon: <Thermometer className="w-4 h-4 text-orange-500" />,
    });
  }

  if (analysis.rule_triggered && analysis.rule_triggered !== "R0_no_threshold_crossed") {
    flagReasons.push({
      title: `Automated Rule Triggered: ${analysis.rule_triggered}`,
      detail: `Agronomic expert system matched formal criteria: ${analysis.explanation || "Anomalous biophysical thresholds breached."}`,
      severity: "info",
      icon: <Info className="w-4 h-4 text-emerald-600" />,
    });
  }

  // Circular gauge calculations
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className={`bg-white rounded-2xl border ${config.border} p-6 shadow-xs`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-5">
          <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 84 84">
              <circle cx="42" cy="42" r={radius} className="stroke-gray-100" strokeWidth="6.5" fill="transparent" />
              <circle
                cx="42"
                cy="42"
                r={radius}
                className={`${config.trackColor} transition-all duration-1000 ease-out`}
                strokeWidth="6.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-gray-950 tracking-tight font-mono">{riskScore}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">/ 100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${config.badgeBg}`}>
                {config.icon}
                {config.label}
              </span>
              <span className="text-xs text-gray-400 font-mono">Confidence: {Math.round(confidence * 100)}%</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">AI Agronomic Risk Index</h3>
            <p className="text-xs text-gray-500 mt-0.5">{config.sublabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50/80 border border-gray-200/60 rounded-xl p-3 text-xs">
          <div className="px-3 border-r border-gray-200">
            <span className="text-gray-400 block font-medium text-[10px] uppercase">Plot Target</span>
            <span className="font-bold text-gray-900">{farm?.crop_type || "Crop"} (Farm #{farm?.id})</span>
          </div>
          <div className="px-3 border-r border-gray-200">
            <span className="text-gray-400 block font-medium text-[10px] uppercase">Declared Area</span>
            <span className="font-bold text-gray-900">{farm?.area_hectares} ha</span>
          </div>
          <div className="px-3">
            <span className="text-gray-400 block font-medium text-[10px] uppercase">Claim Status</span>
            <span className={`font-bold ${isHigh ? "text-red-700" : "text-emerald-700"}`}>
              {isHigh ? "Eligible for Claim" : "Compliant"}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-gray-500" />
            Why This Farm is Flagged
          </h4>
          <span className="text-[11px] text-gray-400 font-mono">Automated Agronomic Telemetry Audit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {flagReasons.map((reason, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs transition ${
                reason.severity === "critical"
                  ? "bg-red-50/40 border-red-200/80 text-red-950"
                  : reason.severity === "warning"
                  ? "bg-amber-50/40 border-amber-200/80 text-amber-950"
                  : "bg-gray-50/70 border-gray-200/70 text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {reason.icon}
                <span>{reason.title}</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{reason.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
