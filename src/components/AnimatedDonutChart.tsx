import React, { useState, useEffect } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface AnimatedDonutChartProps {
  total: number;
  centerLabel: string;
  segments: DonutSegment[];
  size?: number;
}

export const AnimatedDonutChart: React.FC<AnimatedDonutChartProps> = ({
  total,
  centerLabel,
  segments,
  size = 170,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const strokeWidth = 15;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const activeSegments = segments.filter((s) => s.value > 0);
  const hasMultiple = activeSegments.length > 1;
  const gap = hasMultiple ? 3 : 0;

  let accumulated = 0;
  const computedSegments = segments.map((seg, idx) => {
    if (total <= 0 || seg.value <= 0) {
      return {
        ...seg,
        percent: 0,
        arcLength: 0,
        offset: 0,
        idx,
      };
    }
    const percent = seg.value / total;
    const arcLength = Math.max(0, percent * circumference - gap);
    const offset = accumulated + gap / 2;
    accumulated += percent * circumference;
    return {
      ...seg,
      percent,
      arcLength,
      offset,
      idx,
    };
  });

  const activeHover = hoveredIndex !== null ? segments[hoveredIndex] : null;
  const displayValue = activeHover ? activeHover.value : total;
  const displayLabel = activeHover
    ? `${activeHover.label} (${total > 0 ? ((activeHover.value / total) * 100).toFixed(0) : 0}%)`
    : centerLabel;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-5 w-full py-1">
      {/* Donut SVG Ring */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 origin-center"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Data segments */}
          {total > 0 &&
            computedSegments.map((seg) => {
              if (seg.value <= 0) return null;
              const isHovered = hoveredIndex === seg.idx;
              const strokeVal = isMounted ? seg.arcLength : 0;

              return (
                <circle
                  key={seg.idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${strokeVal} ${circumference - strokeVal}`}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredIndex(seg.idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer transition-all duration-700 ease-out"
                  style={{
                    filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1,
                  }}
                />
              );
            })}
        </svg>

        {/* Center Metrics display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          <span className="text-2xl font-extrabold font-mono tracking-tight text-slate-900 transition-all">
            {displayValue}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[110px] transition-all">
            {displayLabel}
          </span>
        </div>
      </div>

      {/* Segment Legend */}
      <div className="flex flex-col gap-1.5 w-full sm:w-auto min-w-[200px]">
        {segments.map((seg, idx) => {
          const isHovered = hoveredIndex === idx;
          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(0) : '0';

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                isHovered ? 'bg-slate-100 shadow-2xs font-semibold' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                  style={{
                    backgroundColor: seg.color,
                    transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
                <span className={isHovered ? 'text-slate-900' : 'text-slate-600'}>{seg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{seg.value}</span>
                <span className="font-mono text-[11px] text-slate-400 w-9 text-right">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

