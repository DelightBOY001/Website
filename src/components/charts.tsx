'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight hand-rolled SVG charts.
 * Zero dependencies, tiny bundles, full dark-theme control.
 */

export function BarChart({
  data,
  height = 180,
  className,
  formatValue = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = Math.min(38, 100 / Math.max(1, data.length));
  return (
    <div className={cn('w-full', className)}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 34);
          const x = (i + 0.5) * (100 / data.length) - barW / 2;
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x}
                y={height - 24 - h}
                width={barW}
                height={Math.max(h, d.value > 0 ? 2 : 0)}
                rx="3"
                fill="url(#barGrad)"
              />
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="8" fill="#64748b">
                {d.label}
              </text>
              <text
                x={x + barW / 2}
                y={height - 28 - h}
                textAnchor="middle"
                fontSize="7.5"
                fill="#94a3b8"
              >
                {formatValue(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LineChart({
  data,
  height = 180,
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}) {
  const id = useId();
  const max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 96 + 2;
    const y = height - 28 - (d.value / max) * (height - 52);
    return { x, y, ...d };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1]?.x ?? 0} ${height - 24} L ${pts[0]?.x ?? 0} ${height - 24} Z`;
  return (
    <div className={cn('w-full', className)}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`lineFill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`lineStroke-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#lineFill-${id})`} />
        <path d={path} fill="none" stroke={`url(#lineStroke-${id})`} strokeWidth="1.6" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={p.x} cy={p.y} r="1.8" fill="#00f0ff" />
            <text x={p.x} y={height - 8} textAnchor="middle" fontSize="7" fill="#64748b">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DonutChart({
  segments,
  size = 150,
  centerLabel,
  centerValue,
  className,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const total = Math.max(
    1,
    segments.reduce((acc, s) => acc + s.value, 0),
  );
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className={cn('flex items-center gap-5', className)}>
      <svg width={size} height={size} viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circumference;
          const el = (
            <circle
              key={`${s.label}-${i}`}
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="13"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
            />
          );
          offset += dash;
          return el;
        })}
        {centerValue && (
          <text x="65" y="62" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x="65" y="80" textAnchor="middle" fontSize="8" fill="#64748b">
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={`${s.label}-legend-${i}`} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-400">{s.label}</span>
            <span className="font-semibold text-white">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
