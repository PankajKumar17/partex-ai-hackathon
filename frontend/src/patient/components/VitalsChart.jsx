import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts'

export default function VitalsChart({ data, dataKeys, targetMin, targetMax }) {
  if (!data || data.length === 0) return null

  // Calculate Y domain
  let allValues = []
  dataKeys.forEach(dk => {
    data.forEach(d => {
      if (d[dk.key] !== undefined && d[dk.key] !== null) {
        allValues.push(d[dk.key])
      }
    })
  })

  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const padding = Math.max(10, (maxVal - minVal) * 0.15)
  const yMin = Math.floor(minVal - padding)
  const yMax = Math.ceil(maxVal + padding)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'white',
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        fontSize: 12,
      }}>
        <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 500 }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Target range area */}
          {targetMin !== undefined && targetMax !== undefined && (
            <ReferenceArea
              y1={targetMin}
              y2={targetMax}
              fill="#10b981"
              fillOpacity={0.06}
              stroke="none"
            />
          )}

          {/* Target line */}
          {targetMax && !targetMin && (
            <ReferenceLine
              y={targetMax}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          )}

          {dataKeys.map((dk) => (
            <Line
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              stroke={dk.color}
              name={dk.name}
              strokeWidth={2.5}
              dot={{ r: 4, fill: dk.color, strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 6, fill: dk.color, stroke: 'white', strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
