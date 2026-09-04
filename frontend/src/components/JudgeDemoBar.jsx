import React from 'react';
import { Zap, CheckCircle2, ChevronRight, X, Play, Pause, ShieldCheck } from 'lucide-react';

export default function JudgeDemoBar({
  currentStep = 1,
  totalSteps = 6,
  onNext,
  onExit,
  nextLabel = 'Next Step',
  isActionLoading = false,
  autoPlay = false,
  onToggleAutoPlay,
}) {
  const steps = [
    { num: '01', title: 'Farmer', desc: 'Ravi Kumar (AgriStack)' },
    { num: '02', title: 'Field', desc: 'Plot #1 Wheat (2.8 ha)' },
    { num: '03', title: 'Diagnosis', desc: 'Drought Calamity & Rules' },
    { num: '04', title: 'Satellite Evidence', desc: 'Sentinel-2 L2A 5-Pass' },
    { num: '05', title: 'Village Impact', desc: '2.0 km Geodesic Cluster' },
    { num: '06', title: 'Proof Packet', desc: 'SHA-256 PDF & QR Seal' },
  ];

  return (
    <div className="sticky top-16 z-30 bg-slate-950 text-white border-b border-emerald-800/40 px-4 py-2.5 shadow-lg backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Title / Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xs">
            <Zap className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-emerald-400 font-mono">
                Judge Demo Mode
              </span>
              <span className="text-[10px] bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded font-mono">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Guided end-to-end PMFBY calamity adjudication walkthrough
            </p>
          </div>
        </div>

        {/* 6-Step Compact Progress Indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={step.num}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition border ${
                  isCurrent
                    ? 'bg-emerald-900/60 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-500/50'
                    : isCompleted
                    ? 'bg-slate-900 border-emerald-800/60 text-emerald-300'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span
                    className={`font-mono text-[10px] font-bold px-1 rounded ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.num}
                  </span>
                )}
                <span className="font-semibold whitespace-nowrap text-[11px]">
                  {step.title}
                </span>
                {idx < steps.length - 1 && (
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
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition flex items-center gap-1 border border-slate-700"
              title={autoPlay ? 'Pause Auto-Advance' : 'Play Auto-Advance'}
            >
              {autoPlay ? (
                <>
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px]">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px]">Auto Play</span>
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
              <span>{isActionLoading ? 'Processing...' : nextLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onExit}
            className="text-xs p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 transition flex items-center gap-1 border border-slate-700"
            title="Exit Judge Demo Mode"
          >
            <X className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Exit Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
