export default function MetricGauge({ label, icon, value, min, max, thresholdLabel, thresholdPosition, gradientClass, lowLabel, highLabel }) {
  const clamped = Math.max(min, Math.min(max, value));
  const percent = ((clamped - min) / (max - min)) * 100;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span>{icon}</span> {label}
        </span>
        <span className="text-sm font-mono font-bold text-gray-900 border rounded-lg px-3 py-1">
          {value.toFixed(2)}
        </span>
      </div>

      <div className={`h-2 rounded-full ${gradientClass} mb-1`}></div>
      <div className="relative h-3">
        <div
          className="absolute top-0 w-3 h-3 bg-gray-800 rounded-full border-2 border-white shadow -translate-x-1/2"
          style={{ left: `${percent}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
        <span>{lowLabel}</span>
        <span className="text-amber-600 font-medium">{thresholdLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}