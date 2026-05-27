"use client"

import { useState, useRef, useCallback } from "react"

interface BarChartProps {
  data: { label: string; value: number }[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  className?: string
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function formatDateLabel(iso: string): string {
  const parts = iso.split("-")
  if (parts.length < 3) return iso
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  return `${MONTH_ABBR[m] ?? parts[1]} ${d}`
}

function niceMax(val: number): number {
  if (val === 0) return 10
  const mag = Math.pow(10, Math.floor(Math.log10(val)))
  const norm = val / mag
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return nice * mag
}

export default function BarChart({ data, color = "#003434", height = 200, formatValue, className }: BarChartProps) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: string } | null>(null)

  const GRID_LINES    = 4
  const maxVal        = niceMax(Math.max(...data.map(d => d.value), 0))
  const TOP_PAD       = 10
  const BOTTOM_H      = 24          // label row height in SVG units
  const BAR_GAP_RATIO = 0.40
  const n             = data.length

  // Each label is ~38 SVG units wide at fontSize 7.5 — so minimum slot = 40
  // We never go below that; if we have few bars we expand generously.
  const SLOT   = Math.max(40, Math.round(600 / Math.max(n, 1)))
  const totalW = n * SLOT
  const chartH = 160
  const totalH = TOP_PAD + chartH + BOTTOM_H

  const gridVals  = Array.from({ length: GRID_LINES + 1 }, (_, i) => (maxVal / GRID_LINES) * i)
  const barW      = SLOT * (1 - BAR_GAP_RATIO)
  const barOffset = (SLOT - barW) / 2

  // Label step: show every N-th label so that they never crowd.
  // A label occupies ~40 SVG units; at labelStep=1 they are SLOT apart.
  // We need SLOT >= 40 → already guaranteed above, so labelStep=1 always works.
  const labelStep = 1

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect   = svg.getBoundingClientRect()
    const relX   = e.clientX - rect.left
    const slotPx = rect.width / n
    const idx    = Math.floor(relX / slotPx)
    if (idx < 0 || idx >= n) { setTooltip(null); return }
    const d          = data[idx]
    const displayVal = formatValue ? formatValue(d.value) : d.value.toLocaleString()
    // bar height in px
    const drawH  = rect.height * (chartH / totalH)
    const barPx  = maxVal > 0 ? (d.value / maxVal) * drawH : 0
    const topPx  = rect.height * (TOP_PAD / totalH)
    const tipY   = topPx + drawH - barPx - 30
    setTooltip({
      x: (idx + 0.5) * slotPx,
      y: Math.max(tipY, 2),
      label: formatDateLabel(d.label),
      value: displayVal,
    })
  }, [data, n, maxVal, totalH, chartH, formatValue])

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-xs text-zinc-300 ${className ?? ""}`} style={{ height }}>
        No data
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", height, overflow: "hidden" }} className={className}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${totalW} ${totalH}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Horizontal gridlines */}
        {gridVals.map((gv, gi) => {
          const gy = TOP_PAD + chartH - (gv / maxVal) * chartH
          return (
            <line key={gi} x1={0} y1={gy} x2={totalW} y2={gy} stroke="#e4e4e7" strokeWidth={0.5} />
          )
        })}

        {/* Bars + x-axis labels */}
        {data.map((d, i) => {
          const barH      = maxVal > 0 ? Math.max((d.value / maxVal) * chartH, d.value > 0 ? 1.5 : 0) : 0
          const bx        = i * SLOT + barOffset
          const by        = TOP_PAD + chartH - barH
          const showLabel = i % labelStep === 0
          const lbl       = formatDateLabel(d.label)
          return (
            <g key={i}>
              <rect x={bx} y={by} width={barW} height={barH} fill={color} rx={0} ry={0} />
              {showLabel && (
                <text
                  x={i * SLOT + SLOT / 2}
                  y={totalH - 5}
                  fontSize={7.5}
                  fill="#71717a"
                  textAnchor="middle"
                  fontFamily="'Open Sans', ui-sans-serif, system-ui, sans-serif"
                >
                  {lbl}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            fontFamily: "'Open Sans', sans-serif",
            zIndex: 10,
          }}
          className="bg-zinc-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-lg leading-tight"
        >
          <span className="text-zinc-400 font-normal">{tooltip.label}:&nbsp;</span>
          {tooltip.value}
        </div>
      )}
    </div>
  )
}
