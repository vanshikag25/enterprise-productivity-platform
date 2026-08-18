'use client';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
}

const SVG_VIEWBOX_WIDTH = 100;

export function LineChart({
  data,
  height = 160,
  color = '#3b82f6',
  formatValue,
}: LineChartProps) {
  if (data.length === 0) {
    return <ChartEmpty />;
  }

  const max = Math.max(1, ...data.map((d) => d.value));
  const points = data.map((d, i) => ({
    x: data.length <= 1 ? SVG_VIEWBOX_WIDTH : (i / (data.length - 1)) * SVG_VIEWBOX_WIDTH,
    y: height - (d.value / max) * height,
    value: d.value,
  }));
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ');
  const area = `${path} L${SVG_VIEWBOX_WIDTH},${height} L0,${height} Z`;

  const labelIndices = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );
  const maxPoint = points.reduce((a, b) => (b.value > a.value ? b : a), points[0]);

  return (
    <div>
      <div className="flex items-center justify-end text-[10px] text-slate-400">
        {formatValue ? formatValue(max) : max.toLocaleString()} max
      </div>
      <svg
        viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Line chart"
      >
        <defs>
          <linearGradient id={`area-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#area-fill-${color.replace('#', '')})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={maxPoint.x}
          cy={maxPoint.y}
          r={2.5}
          fill={color}
          stroke="#fff"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {labelIndices.map((i) => (
          <span key={i}>{data[i].label}</span>
        ))}
      </div>
    </div>
  );
}

interface BarRow {
  key: string;
  label: string;
  sub?: string;
  value: number;
}

interface BarChartProps {
  data: BarRow[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
}

export function BarChart({
  data,
  height = 22,
  color = '#6366f1',
  formatValue,
}: BarChartProps) {
  if (data.length === 0) {
    return <ChartEmpty />;
  }

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.key} className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-slate-700">{d.label}</span>
            {d.sub && <span className="block truncate text-[10px] text-slate-400">{d.sub}</span>}
          </span>
          <div className="h-5 w-40 shrink-0 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, backgroundColor: color, minHeight: height }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
            {formatValue ? formatValue(d.value) : d.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
      No data in this period
    </div>
  );
}
