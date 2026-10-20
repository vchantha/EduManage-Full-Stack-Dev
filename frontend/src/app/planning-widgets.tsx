import { BookOpen, ChevronDown, ArrowUpRight } from "lucide-react";
export const palette = [
  "#2784ff",
  "#22c690",
  "#ac67ff",
  "#ffa42e",
  "#ff6180",
  "#12adbe",
  "#8a85ff",
  "#b5b6ba",
];
export function Pill({ text }: { text: string }) {
  const color =
    ["Active", "Completed", "Ongoing", "Present", "Approved"].includes(text) ||
    text === "100%"
      ? "green"
      : ["Upcoming", "Medium"].includes(text)
        ? "blue"
        : ["Not Started", "Absent", "High"].includes(text) || text === "0%"
          ? "red"
          : "orange";
  return <span className={`p-pill ${color}`}>{text}</span>;
}
export function Metric({
  title,
  value,
  note,
  color,
  icon: Icon = BookOpen,
  onClick,
  percent,
}: {
  title: string;
  value: string | number;
  note: string;
  color: string;
  icon?: typeof BookOpen;
  onClick?: () => void;
  percent?: number;
}) {
  return (
    <button
      className={`p-metric ${color}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="p-metric-icon">
        <Icon size={28} />
      </span>
      <span>
        <small>{title}</small>
        <strong>{value}</strong>
        <span>{note}</span>
      </span>
      {percent !== undefined && (
        <span
          className="p-ring"
          style={{
            background: `conic-gradient(currentColor ${percent}%,#edf0f4 0)`,
          }}
        >
          <b>{percent}%</b>
        </span>
      )}
      {onClick && <ArrowUpRight className="p-metric-arrow" size={16} />}
    </button>
  );
}
export function Bars({
  values,
  labels,
  max = 10000,
  color = "orange",
}: {
  values: number[];
  labels: string[];
  max?: number;
  color?: string;
}) {
  return (
    <div className={`p-bars ${color}`}>
      <div className="p-y-axis">
        {[max, max * 0.75, max * 0.5, max * 0.25, 0].map((n) => (
          <span key={n}>{Math.round(n).toLocaleString("en-US")}</span>
        ))}
      </div>
      <div className="p-bar-columns">
        {values.map((value, i) => (
          <div className="p-bar-column" key={labels[i]}>
            <div className="p-bar-track">
              <div style={{ height: `${(value / max) * 100}%` }}>
                <strong>{value.toLocaleString("en-US")}</strong>
              </div>
            </div>
            <small>{labels[i]}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Donut({
  items,
  value,
  caption,
  compact = false,
}: {
  items: { label: string; value: number; color: string }[];
  value: string | number;
  caption: string;
  compact?: boolean;
}) {
  const total = items.reduce((n, i) => n + i.value, 0);
  let position = 0;
  const stops = items
    .map((item) => {
      const start = position;
      position += total ? (item.value / total) * 100 : 0;
      return `${item.color} ${start}% ${position}%`;
    })
    .join(",");
  return (
    <div className={`p-donut-layout ${compact ? "compact" : ""}`}>
      <div
        className="p-donut"
        role="img"
        aria-label={`${value} ${caption}`}
        style={{ background: total ? `conic-gradient(${stops})` : "#edf2f7" }}
      >
        <div>
          <strong>{value}</strong>
          <small>{caption}</small>
        </div>
      </div>
      <div className="p-donut-legend">
        {items.map((item) => (
          <div key={item.label}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString("en-US")}</strong>
            <small>
              ({total ? ((item.value / total) * 100).toFixed(1) : 0}%)
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
export function LineChart({
  values,
  second,
  labels,
  max = 100,
  blue = false,
  id = "planning-chart",
}: {
  values: number[];
  second?: number[];
  labels: string[];
  max?: number;
  blue?: boolean;
  id?: string;
}) {
  const left = 38,
    right = 568,
    top = 15,
    bottom = 170;
  const points = (ns: number[]) =>
    ns
      .map(
        (n, i) =>
          `${left + (i * (right - left)) / (ns.length - 1)},${bottom - (n / max) * (bottom - top)}`,
      )
      .join(" ");
  return (
    <svg
      className={`p-line-chart ${blue ? "blue" : ""}`}
      viewBox="0 0 590 201"
      role="img"
      aria-label={
        blue
          ? "Student enrollment trend"
          : "Planned and completed teaching progress"
      }
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={blue ? "#2784ff" : "#ffa031"}
            stopOpacity=".32"
          />
          <stop
            offset="100%"
            stopColor={blue ? "#2784ff" : "#ffa031"}
            stopOpacity=".04"
          />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line
            x1={left}
            x2={right}
            y1={bottom - p * (bottom - top)}
            y2={bottom - p * (bottom - top)}
            stroke="#e9eff7"
            strokeDasharray="3 3"
          />
          <text
            x="26"
            y={bottom - p * (bottom - top) + 4}
            fontSize="10"
            textAnchor="end"
            fill="#8393b1"
          >
            {Math.round(max * p).toLocaleString("en-US")}
          </text>
        </g>
      ))}
      <polygon
        points={`${left},${bottom} ${points(second || values)} ${right},${bottom}`}
        fill={`url(#${id})`}
      />
      <polyline
        points={points(values)}
        stroke="#2784ff"
        fill="none"
        strokeWidth="2"
      />
      {second && (
        <polyline
          points={points(second)}
          stroke="#ff951d"
          fill="none"
          strokeWidth="2"
        />
      )}
      {values.map((n, i) => (
        <g key={i}>
          <circle
            cx={left + (i * (right - left)) / (values.length - 1)}
            cy={bottom - (n / max) * (bottom - top)}
            r="3.4"
            fill="#2784ff"
          >
            <title>{`${labels[i]}: ${n}`}</title>
          </circle>
          {second && (
            <circle
              cx={left + (i * (right - left)) / (values.length - 1)}
              cy={bottom - (second[i] / max) * (bottom - top)}
              r="3"
              fill="#ff951d"
            />
          )}
          <text
            x={left + (i * (right - left)) / (values.length - 1)}
            y="193"
            fontSize="9"
            textAnchor="middle"
            fill="#7185a8"
          >
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
export function PageHeader({
  title,
  crumb,
  children,
}: {
  title: string;
  crumb: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-page-heading">
      <div>
        <h1>{title}</h1>
        <p>
          Dashboard <span>›</span> Academics <span>›</span> {crumb}
        </p>
      </div>
      <div className="p-heading-actions">{children}</div>
    </div>
  );
}
export function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="p-picker">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={13} />
    </label>
  );
}
