"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { month: "Jun", yield: 18, target: 20 },
  { month: "Jul", yield: 24, target: 22 },
  { month: "Aug", yield: 21, target: 24 },
  { month: "Sep", yield: 30, target: 26 },
  { month: "Oct", yield: 34, target: 30 },
  { month: "Nov", yield: 41, target: 34 },
]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: "white",
        border: "3px solid #1a2e12",
        boxShadow: "4px 4px 0px #1a2e12",
        padding: "10px 14px",
      }}
    >
      <p style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 13, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>{`Yield: ${payload[0].value} qtl/acre`}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#c86a1f" }}>{`Target: ${payload[1].value} qtl/acre`}</p>
    </div>
  )
}

export function YieldChart() {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#d8d3c2" strokeWidth={1.5} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={{ stroke: "#1a2e12", strokeWidth: 2 }}
            tick={{ fontSize: 12, fontWeight: 700, fill: "#1a2e12" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fontWeight: 700, fill: "#566047" }}
          />
          <Tooltip cursor={{ fill: "rgba(215, 227, 75, 0.35)" }} content={<ChartTooltip />} />
          <Bar dataKey="yield" fill="#2e7d32" stroke="#1a2e12" strokeWidth={2} radius={0} />
          <Bar dataKey="target" fill="#d7e34b" stroke="#1a2e12" strokeWidth={2} radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
