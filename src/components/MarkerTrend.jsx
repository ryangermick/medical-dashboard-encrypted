import { useMemo } from 'react'
import { X, TrendingUp, TrendingDown, Minus, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceArea } from 'recharts'

export default function MarkerTrend({ marker, panels, onClose }) {
  const navigate = useNavigate()
  if (!marker) return null

  const markerName = typeof markerName === 'string' ? markerName : String(markerName || '')

  // Find all instances of this marker across all panels
  const history = useMemo(() => {
    const points = []
    panels.forEach(panel => {
      if (!panel.drawn_date) return
      panel.parsedResults.forEach(r => {
        if (r.name === markerName) {
          const numVal = parseFloat(typeof r.value === 'object' ? JSON.stringify(r.value) : r.value)
          if (isNaN(numVal)) return
          points.push({
            date: panel.drawn_date,
            value: numVal,
            unit: String(r.unit || ''),
            range: r.range ? String(r.range) : null,
            status: r.status ? String(r.status) : null,
            panel: typeof panel.panel_name === 'string' ? panel.panel_name : String(panel.panel_abbr || 'Panel'),
          })
        }
      })
    })
    // Sort by date ascending
    points.sort((a, b) => new Date(a.date) - new Date(b.date))
    // Deduplicate by date (keep first)
    const seen = new Set()
    return points.filter(p => {
      if (seen.has(p.date)) return false
      seen.add(p.date)
      return true
    })
  }, [markerName, panels])

  if (!history.length) return null

  // Parse range for reference area
  const refRange = history[0]?.range
  let rangeMin = null, rangeMax = null
  if (refRange?.includes('-')) {
    const parts = refRange.split('-').map(s => parseFloat(s.trim()))
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      rangeMin = parts[0]
      rangeMax = parts[1]
    }
  } else if (refRange?.startsWith('<')) {
    rangeMax = parseFloat(refRange.slice(1))
    rangeMin = 0
  } else if (refRange?.startsWith('>')) {
    rangeMin = parseFloat(refRange.slice(1))
  }

  const latest = history[history.length - 1]
  const oldest = history[0]
  const change = history.length >= 2 ? latest.value - oldest.value : null
  const changePercent = change !== null && oldest.value ? ((change / oldest.value) * 100).toFixed(1) : null

  // Chart data
  const chartData = history.map(h => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    rawDate: h.date,
    value: h.value,
    status: h.status,
  }))

  // Y axis domain
  const values = history.map(h => h.value)
  const allVals = [...values]
  if (rangeMin !== null) allVals.push(rangeMin)
  if (rangeMax !== null) allVals.push(rangeMax)
  const yMin = Math.min(...allVals) * 0.85
  const yMax = Math.max(...allVals) * 1.15

  const chatAbout = () => {
    onClose()
    const trend = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'stayed the same'
    navigate('/ask-ai', { state: { prefill: `My ${markerName} has ${trend} from ${oldest.value} to ${latest.value} ${latest.unit} over ${history.length} readings (${oldest.date} to ${latest.date}). Normal range is ${refRange || 'unknown'}. What does this trend mean?` } })
  }

  const renderDot = (props) => {
    const { cx, cy, payload } = props
    if (cx == null || cy == null) return null
    const normalStatuses = ['normal', 'optimal', 'within range']
    const isNormal = payload?.status && normalStatuses.includes((payload.status || '').toLowerCase())
    return (
      <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={isNormal ? '#22c55e' : '#f59e0b'} stroke="#14141f" strokeWidth={2} />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass rounded-2xl p-6 max-w-lg w-full relative z-10 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{markerName}</h2>
            <p className="text-xs text-text-muted mt-1">{history.length} reading{history.length > 1 ? 's' : ''} • {oldest.date} → {latest.date}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted">
            <X size={18} />
          </button>
        </div>

        {/* Current value + change */}
        <div className="flex gap-3 mb-5">
          <div className="glass rounded-xl p-4 flex-1">
            <span className="text-xs text-text-muted uppercase tracking-wider">Latest</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-light text-text-primary">{latest.value}</span>
              <span className="text-sm text-text-muted">{latest.unit}</span>
            </div>
            {refRange && <p className="text-xs text-text-muted mt-1">Range: {refRange}</p>}
          </div>
          {change !== null && (
            <div className="glass rounded-xl p-4 flex-1">
              <span className="text-xs text-text-muted uppercase tracking-wider">Change</span>
              <div className="flex items-center gap-2 mt-1">
                {change > 0 ? <TrendingUp size={18} className="text-accent-amber" /> : change < 0 ? <TrendingDown size={18} className="text-accent-green" /> : <Minus size={18} className="text-text-muted" />}
                <span className={`text-2xl font-light ${change > 0 ? 'text-accent-amber' : change < 0 ? 'text-accent-green' : 'text-text-muted'}`}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}
                </span>
              </div>
              {changePercent && <p className="text-xs text-text-muted mt-1">{changePercent}% {change > 0 ? 'increase' : 'decrease'}</p>}
            </div>
          )}
        </div>

        {/* Chart */}
        {history.length >= 2 ? (
          <div className="glass rounded-xl p-4 mb-5">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {rangeMin !== null && rangeMax !== null && (
                  <ReferenceArea y1={rangeMin} y2={rangeMax} fill="#22c55e" fillOpacity={0.06} />
                )}
                {rangeMin !== null && <ReferenceLine y={rangeMin} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.4} />}
                {rangeMax !== null && <ReferenceLine y={rangeMax} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.4} />}
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: '#14141f', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val) => [`${val} ${latest.unit}`, markerName]}
                  labelFormatter={(label) => label}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#trendGrad)" strokeWidth={2} dot={renderDot} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="glass rounded-xl p-4 mb-5 text-center">
            <p className="text-sm text-text-muted">Only 1 reading — upload more records to see trends</p>
          </div>
        )}

        {/* History table */}
        <div className="glass rounded-xl p-4 mb-5 max-h-40 overflow-y-auto">
          <span className="text-xs text-text-muted uppercase tracking-wider">All Readings</span>
          <div className="mt-2 space-y-1.5">
            {history.map((h, i) => {
              const normalStatuses = ['normal', 'optimal', 'within range']
              const isNormal = h.status && normalStatuses.includes((h.status || '').toLowerCase())
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">{h.date}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${isNormal ? 'text-text-primary' : 'text-accent-amber font-semibold'}`}>{h.value}</span>
                    <span className="text-text-muted text-xs">{h.unit}</span>
                    <span className={`w-2 h-2 rounded-full ${isNormal ? 'bg-accent-green' : 'bg-accent-amber'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={chatAbout} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white text-sm font-medium transition-all">
            <MessageCircle size={16} /> Ask AI About Trend
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover text-text-muted text-sm transition-all border border-border-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
