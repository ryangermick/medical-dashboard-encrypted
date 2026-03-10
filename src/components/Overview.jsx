import { safeJsonParse } from '../lib/crypto'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Heart, Thermometer, Wind, Droplets, Activity, TrendingDown, AlertTriangle, CheckCircle, Info, Calendar, ChevronRight, Scale } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'

const StatusDot = ({ status }) => {
  const colors = { normal: 'bg-accent-green', optimal: 'bg-accent-cyan', elevated: 'bg-accent-amber', high: 'bg-accent-red' }
  return <span className={`w-2 h-2 rounded-full ${colors[status] || colors.normal} inline-block`} />
}

const VitalCard = ({ icon: Icon, label, value, unit, status, range, to, navigate }) => (
  <div onClick={() => to && navigate(to)} className={`glass rounded-2xl p-5 hover:border-border-hover transition-all ${to ? 'cursor-pointer group' : ''}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={16} strokeWidth={1.5} className="text-text-muted" />
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusDot status={status} />
        {to && <ChevronRight size={14} strokeWidth={1.5} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-light text-text-primary">{value}</span>
      <span className="text-sm text-text-muted">{unit}</span>
    </div>
    <p className="text-xs text-text-muted mt-2">Range: {range}</p>
  </div>
)

// Extract latest vital value from vitals array
function getLatestVital(vitals, type) {
  const filtered = vitals.filter(v => v.vital_type === type).sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
  if (!filtered.length) return null
  const latest = filtered[0]
  const val = typeof latest.value === 'string' ? safeJsonParse(latest.value) : latest.value
  return { ...latest, parsed: val }
}

function getVitalHistory(vitals, type) {
  return vitals
    .filter(v => v.vital_type === type)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .map(v => {
      const val = typeof v.value === 'string' ? safeJsonParse(v.value) : v.value
      const month = new Date(v.recorded_at).toLocaleString('default', { month: 'short' })
      return { ...val, month, date: v.recorded_at }
    })
}

export default function Overview() {
  const navigate = useNavigate()
  const { patient, vitals, labResults, medications, allergies } = useData()

  const hr = getLatestVital(vitals, 'heart_rate')
  const bp = getLatestVital(vitals, 'blood_pressure')
  const temp = getLatestVital(vitals, 'temperature')
  const o2 = getLatestVital(vitals, 'oxygen_sat')
  const resp = getLatestVital(vitals, 'respiratory_rate')
  const restHr = getLatestVital(vitals, 'resting_hr')
  const weight = getLatestVital(vitals, 'weight')

  const hrHistory = getVitalHistory(vitals, 'heart_rate').map(d => ({ month: d.month, hr: d.avg }))
  const weightHistory = getVitalHistory(vitals, 'weight').map(d => ({ month: d.month, weight: d.avg }))

  // Generate insights from real data
  const insights = useMemo(() => {
    const list = []
    // Check lab results for elevated values
    labResults.forEach(lab => {
      const results = typeof lab.results === 'string' ? safeJsonParse(lab.results) : lab.results
      if (Array.isArray(results)) {
        results.forEach(r => {
          if (r.status === 'elevated') {
            list.push({ type: 'watch', title: `${r.name} Elevated`, description: `${r.value} ${r.unit} (range: ${r.range})`, category: lab.panel_abbr || 'Labs' })
          }
        })
      }
    })
    // Weight trend
    if (weightHistory.length >= 2) {
      const first = weightHistory[0].weight
      const last = weightHistory[weightHistory.length - 1].weight
      if (last < first) {
        list.push({ type: 'good', title: 'Weight Trending Down', description: `${first} → ${last} lbs over ${weightHistory.length} months`, category: 'Weight' })
      }
    }
    // Medication count
    if (medications.length > 0) {
      list.push({ type: 'info', title: `${medications.filter(m => m.active).length} Active Medications`, description: medications.filter(m => m.active).map(m => m.name).join(', '), category: 'Rx' })
    }
    // Allergies
    if (allergies.length > 0) {
      list.push({ type: 'watch', title: `${allergies.length} Known Allergies`, description: allergies.map(a => a.allergen).join(', '), category: 'Allergy' })
    }
    return list
  }, [labResults, weightHistory, medications, allergies])

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-text-muted mb-4">No patient data yet. Load demo data or upload medical records to get started.</p>
        <button onClick={() => navigate('/settings')} className="px-4 py-2 rounded-xl bg-accent-blue text-white text-sm hover:bg-accent-blue/80 transition-all">
          Go to Settings
        </button>
      </div>
    )
  }

  // Health score based on lab results
  const totalMarkers = labResults.reduce((acc, l) => {
    const res = typeof l.results === 'string' ? safeJsonParse(l.results) : l.results
    return acc + (Array.isArray(res) ? res.length : 0)
  }, 0)
  const normalMarkers = labResults.reduce((acc, l) => {
    const res = typeof l.results === 'string' ? safeJsonParse(l.results) : l.results
    return acc + (Array.isArray(res) ? res.filter(r => r.status === 'normal').length : 0)
  }, 0)
  const healthScore = totalMarkers > 0 ? Math.round((normalMarkers / totalMarkers) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Health Overview</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Last updated: {patient.last_visit} {patient.primary_physician && `• ${patient.primary_physician}`}
          </p>
        </div>
        {healthScore > 0 && (
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
            <span className="text-xs text-text-muted">HEALTH SCORE</span>
            <span className={`text-2xl font-light ${healthScore >= 85 ? 'text-accent-green' : healthScore >= 70 ? 'text-accent-amber' : 'text-accent-red'}`}>{healthScore}</span>
            <span className="text-xs text-text-muted">/100</span>
          </div>
        )}
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {hr && <VitalCard icon={Heart} label="Heart Rate" value={hr.parsed.avg} unit={hr.unit} status={hr.status} range={hr.reference_range} to="/vital/heart_rate" navigate={navigate} />}
        {bp && <VitalCard icon={Activity} label="Blood Pressure" value={`${bp.parsed.systolic}/${bp.parsed.diastolic}`} unit={bp.unit} status={bp.status} range={bp.reference_range} to="/vital/blood_pressure" navigate={navigate} />}
        {o2 && <VitalCard icon={Droplets} label="Oxygen Sat" value={o2.parsed.avg} unit={o2.unit} status={o2.status} range={o2.reference_range} to="/vital/oxygen_sat" navigate={navigate} />}
        {temp && <VitalCard icon={Thermometer} label="Temperature" value={temp.parsed.avg} unit={temp.unit} status={temp.status} range={temp.reference_range} to="/vital/temperature" navigate={navigate} />}
        {resp && <VitalCard icon={Wind} label="Respiratory" value={resp.parsed.avg} unit={resp.unit} status={resp.status} range={resp.reference_range} to="/vital/respiratory_rate" navigate={navigate} />}
        {restHr && <VitalCard icon={Heart} label="Resting HR" value={restHr.parsed.avg} unit={restHr.unit} status={restHr.status} range={restHr.reference_range} to="/vital/resting_hr" navigate={navigate} />}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {hrHistory.length > 0 && (
          <div className="glass rounded-2xl p-5 cursor-pointer hover:border-border-hover transition-all" onClick={() => navigate('/vital/heart_rate')}>
            <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Heart Rate — 12mo</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={hrHistory}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="hr" stroke="#3b82f6" fill="url(#hrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {weightHistory.length > 0 && (
          <div className="glass rounded-2xl p-5 cursor-pointer hover:border-border-hover transition-all" onClick={() => navigate('/vital/weight')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs text-text-muted uppercase tracking-wider">Weight — 12mo</h3>
              {weightHistory.length >= 2 && (
                <div className="flex items-center gap-1 text-accent-green">
                  <TrendingDown size={14} strokeWidth={1.5} />
                  <span className="text-xs font-medium">{weightHistory[0].weight - weightHistory[weightHistory.length-1].weight} lbs</span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weightHistory}>
                <defs>
                  <linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="weight" stroke="#22c55e" fill="url(#wtGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Key Insights</h3>
          <div className="space-y-3">
            {insights.slice(0, 6).map((insight, i) => {
              const config = {
                watch: { icon: AlertTriangle, color: 'text-accent-amber', bg: 'bg-accent-amber/10' },
                good: { icon: CheckCircle, color: 'text-accent-green', bg: 'bg-accent-green/10' },
                info: { icon: Info, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
              }
              const { icon: Icon, color, bg } = config[insight.type] || config.info
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${bg}`}><Icon size={14} strokeWidth={1.5} className={color} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">{insight.title}</p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{insight.description}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-xs ${bg} ${color} shrink-0`}>{insight.category}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
