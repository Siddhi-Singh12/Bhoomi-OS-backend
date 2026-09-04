export default function MetricGauge({ label, icon, value, min, max, thresholdLabel, gradientClass, lowLabel, highLabel }) {
  const safeVal = Number.isFinite(value) ? value : min;
  const clamped = Math.max(min, Math.min(max, safeVal));
  const percent = ((clamped - min) / (max - min)) * 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs hover:border-gray-300 transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          {typeof icon === 'string' ? <span className="text-base">{icon}</span> : icon}
          <span>{label}</span>
        </span>
        <span className="text-sm font-mono font-bold text-gray-950 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-0.5 shadow-2xs">
          {Number.isFinite(value) ? value.toFixed(3) : 'N/A'}
        </span>
      </div>

      <div className={`h-2.5 rounded-full ${gradientClass} mb-1.5 shadow-inner`}></div>
      <div className="relative h-3">
        <div
          className="absolute top-0 w-3.5 h-3.5 bg-gray-900 rounded-full border-2 border-white shadow-md -translate-x-1/2 transition-all duration-500 ease-out"
          style={{ left: `${Math.max(0, Math.min(100, percent))}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 font-medium">
        <span>{lowLabel}</span>
        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
          {thresholdLabel}
        </span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}