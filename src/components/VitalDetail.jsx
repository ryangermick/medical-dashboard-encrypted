import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { ArrowLeft, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, ReferenceLine } from 'recharts'

const VITAL_LABELS = {
  heart_rate: 'Heart Rate',
  blood_pressure: 'Blood Pressure',
  oxygen_sat: 'Oxygen Saturation',
  temperature: 'Temperature',
  respiratory_rate: 'Respiratory Rate',
  resting_hr: 'Resting Heart Rate',
  weight: 'Weight',
}

function StatCard({ label, value, unit, sub }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-light text-text-primary">{value}</span>
        <span className="text-sm text-text-muted">{unit}</span>
      </div>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

export default function VitalDetail() {
  const { vitalId } = useParams()
  const navigate = useNavigate()
  const { vitals } = useData()

  const { data, isBP, label, unit } = useMemo(() => {
    const filtered = vitals
      .filter(v => v.vital_type === vitalId)
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
      .map(v => {
        const val = typeof v.value === 'string' ? JSON.parse(v.value) : v.value
        const month = new Date(v.recorded_at).toLocaleString('default', { month: 'short' })
        return { ...val, date: month, recorded_at: v.recorded_at, status: v.status, reference_range: v.reference_range }
      })

    return {
      data: filtered,
      isBP: vitalId === 'blood_pressure',
      label: VITAL_LABELS[vitalId] || vitalId,
      unit: filtered[0]?.unit || vitals.find(v => v.vital_type === vitalId)?.unit || '',
    }
  }, [vitals, vitalId])

  if (!data.length) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">No data for this vital sign.</p>
        <button onClick={() => navigate('/overview')} className="text-accent-blue mt-4 hover:underline">Back to Overview</button>
      </div>
    )
  }

  const latest = data[data.length - 1]
  const latestValue = isBP ? `${latest.systolic}/${latest.diastolic}` : (latest.avg ?? latest.value)

  // Trend
  const first = isBP ? data[0].systolic : (data[0].avg ?? data[0].value)
  const last = isBP ? latest.systolic : (latest.avg ?? latest.value)
  const diff = last - first
  const pct = first ? ((diff / first) * 100).toFixed(1) : 0
  const TrendIcon = diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus
  const trendColor = diff <= 0 ? 'text-accent-green' : 'text-accent-amber'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/overview')} className="p-2 glass rounded-xl hover:border-border-hover transition-all">
          <ArrowLeft size={18} strokeWidth={1.5} className="text-text-muted" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-text-primary">{label}</h1>
          <p className="text-sm text-text-muted mt-0.5">{data.length}-month history</p>
        </div>
        <div className={`flex items-center gap-1.5 ${trendColor}`}>
          <TrendIcon size={16} strokeWidth={1.5} />
          <span className="text-sm font-medium">{diff > 0 ? '+' : ''}{pct}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Latest" value={latestValue} unit={unit} />
        {isBP ? (
          <>
            <StatCard label="Avg Systolic" value={Math.round(data.reduce((s, d) => s + d.systolic, 0) / data.length)} unit="mmHg" />
            <StatCard label="Avg Diastolic" value={Math.round(data.reduce((s, d) => s + d.diastolic, 0) / data.length)} unit="mmHg" />
            <StatCard label="Target" value="<120/80" unit="mmHg" />
          </>
        ) : (
          <>
            <StatCard label="Average" value={(data.reduce((s, d) => s + (d.avg ?? 0), 0) / data.length).toFixed(1)} unit={unit} sub="12-month" />
            <StatCard label="Min / Max" value={`${Math.min(...data.map(d => d.min ?? d.avg))} / ${Math.max(...data.map(d => d.max ?? d.avg))}`} unit={unit} />
            <StatCard label="Range" value={latest.reference_range || '—'} unit={unit} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">
            {isBP ? 'Systolic & Diastolic — 12mo' : `${label} Trend — 12mo`}
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            {isBP ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
                <ReferenceLine y={120} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="systolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Systolic" />
                <Line type="monotone" dataKey="diastolic" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} name="Diastolic" />
              </LineChart>
            ) : (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="vitalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="avg" stroke="#3b82f6" fill="url(#vitalGrad)" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Average" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Monthly Readings</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey={isBP ? 'systolic' : 'avg'} fill="#3b82f6" radius={[4, 4, 0, 0]} name={isBP ? 'Systolic' : 'Average'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
