import React from 'react';
import { Zap, CheckCircle2, ChevronRight, X, Play, Pause, ShieldCheck, Activity } from 'lucide-react';

export default function JudgeDemoBar({
  currentStep = 1,
  totalSteps = 6,
  onNext,
  onExit,
  nextLabel = 'Next Stage',
  isActionLoading = false,
  autoPlay = false,
  onToggleAutoPlay,
}) {
  const stages = [
    { num: '01', title: 'AgriStack UFSI', desc: 'Identity Verified (Ravi Kumar)' },
    { num: '02', title: 'Cadastral Parcel', desc: 'PostGIS Boundary (Plot #1 Wheat)' },
    { num: '03', title: 'Multi-Spectral AI', desc: 'Biophysical Stress Diagnosis' },
    { num: '04', title: 'Sentinel-2 Orbit', desc: '5-Pass Multi-Temporal Trajectory' },
    { num: '05', title: 'PostGIS Cluster', desc: '2.0 km Geodesic Adjacency Zone' },
    { num: '06', title: 'Cryptographic Seal', desc: 'SHA-256 Digest & QR Seal' },
  ];

  return (
    <div className="sticky top-16 z-30 bg-slate-950 text-white border-b border-emerald-700/50 px-4 py-2.5 shadow-xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Institutional Title / Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 bg-emerald-700 rounded-lg flex items-center justify-center text-white shadow-xs">
            <Zap className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-emerald-300 font-mono">
                Fast-Track Adjudication Pipeline
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-600/70 px-1.5 py-0.2 rounded font-mono font-bold">
                Stage {currentStep} of {totalSteps}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Automated 6-stage PMFBY calamity adjudication & evidence synthesis
            </p>
          </div>
        </div>

        {/* 6-Stage Progress Indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {stages.map((stage, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={stage.num}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition border ${
                  isCurrent
                    ? 'bg-emerald-900/70 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400/50'
                    : isCompleted
                    ? 'bg-slate-900 border-emerald-800/80 text-emerald-300'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span
                    className={`font-mono text-[10px] font-bold px-1 rounded ${
                      isCurrent
                        ? 'bg-emerald-400 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {stage.num}
                  </span>
                )}
                <span className="font-semibold whitespace-nowrap text-[11px]">
                  {stage.title}
                </span>
                {idx < stages.length - 1 && (
                  <span className="text-slate-700 text-[10px] ml-0.5">›</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleAutoPlay && (
            <button
              onClick={onToggleAutoPlay}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium transition flex items-center gap-1 border border-slate-700"
              title={autoPlay ? 'Pause Automated Pipeline' : 'Run Automated Pipeline'}
            >
              {autoPlay ? (
                <>
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px]">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px]">Auto Run</span>
                </>
              )}
            </button>
          )}

          {onNext && currentStep < totalSteps && (
            <button
              onClick={onNext}
              disabled={isActionLoading}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <span>{isActionLoading ? 'Processing Stage...' : nextLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onExit}
            className="text-xs p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-300 text-slate-400 transition flex items-center gap-1 border border-slate-800"
            title="Exit Fast-Track Pipeline"
          >
            <X className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
