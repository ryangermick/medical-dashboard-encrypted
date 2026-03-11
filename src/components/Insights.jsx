import { safeJsonParse } from '../lib/crypto'
import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { AlertTriangle, CheckCircle, Info, Lightbulb, TrendingUp } from 'lucide-react'

const typeConfig = {
  watch: { icon: AlertTriangle, color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/20', label: 'Monitor' },
  good: { icon: CheckCircle, color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/20', label: 'Positive' },
  info: { icon: Info, color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/20', label: 'Informational' },
}

export default function Insights() {
  const { labResults, vitals, medications, allergies, genetics } = useData()

  const insights = useMemo(() => {
    const list = []

    // Lab result insights
    labResults.forEach(lab => {
      const results = typeof lab.results === 'string' ? safeJsonParse(lab.results) : lab.results
      if (Array.isArray(results)) {
        const normalStatuses = ['normal', 'optimal', 'within range']
        results.forEach(r => {
          if (r.status && !normalStatuses.includes((r.status || '').toLowerCase())) {
            list.push({ type: 'watch', title: `${r.name} — ${r.status}`, description: `At ${r.value} ${r.unit}, this is outside the normal range of ${r.range}. Discuss with your physician.`, category: lab.panel_abbr || 'Labs' })
          }
        })
        const normalCount = results.filter(r => r.status && normalStatuses.includes((r.status || '').toLowerCase())).length
        if (normalCount > 0 && normalCount === results.length) {
          list.push({ type: 'good', title: `${lab.panel_abbr || 'Panel'} — All Normal`, description: `All ${results.length} markers in this panel are within normal range.`, category: lab.panel_abbr || 'Labs' })
        }
      }
    })

    // Weight trend
    const weightData = vitals.filter(v => v.vital_type === 'weight').sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    if (weightData.length >= 2) {
      const first = safeJsonParse(typeof weightData[0].value === 'string' ? weightData[0].value : JSON.stringify(weightData[0].value))
      const last = safeJsonParse(typeof weightData[weightData.length-1].value === 'string' ? weightData[weightData.length-1].value : JSON.stringify(weightData[weightData.length-1].value))
      if (last.avg < first.avg) {
        list.push({ type: 'good', title: 'Weight Trending Down', description: `Lost ${first.avg - last.avg} lbs over ${weightData.length} months. Keep it up!`, category: 'Weight' })
      }
    }

    // Genetics insights
    if (genetics) {
      const gData = typeof genetics.data === 'string' ? safeJsonParse(genetics.data) : genetics.data
      if (gData?.riskFactors) {
        gData.riskFactors.filter(rf => rf.status === 'watch').forEach(rf => {
          list.push({ type: 'watch', title: `${rf.condition} Genetic Risk`, description: `${rf.odds} risk via ${rf.gene} (${rf.snp}). Regular monitoring recommended.`, category: 'Genetics' })
        })
        gData.riskFactors.filter(rf => rf.status === 'good').forEach(rf => {
          list.push({ type: 'good', title: `Low Risk: ${rf.condition}`, description: `${rf.odds} risk. Protective variant detected.`, category: 'Genetics' })
        })
      }
      if (gData?.pharmacogenomics) {
        gData.pharmacogenomics.filter(pg => pg.metabolism !== 'Normal').forEach(pg => {
          list.push({ type: 'info', title: `${pg.drug}: ${pg.metabolism} Metabolizer`, description: `${pg.note}. Gene: ${pg.gene}`, category: 'PGx' })
        })
      }
    }

    // Medication count
    if (medications.length > 0) {
      list.push({ type: 'info', title: `${medications.filter(m => m.active).length} Active Medications`, description: medications.filter(m => m.active).map(m => `${m.name} ${m.dose}`).join(', '), category: 'Rx' })
    }

    // Allergies
    allergies.forEach(a => {
      list.push({ type: 'watch', title: `Allergy: ${a.allergen}`, description: `${a.severity} — ${a.reaction}`, category: 'Allergy' })
    })

    // Vital checks
    const bpData = vitals.filter(v => v.vital_type === 'blood_pressure')
    if (bpData.length) {
      const latest = bpData.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0]
      const val = typeof latest.value === 'string' ? safeJsonParse(latest.value) : latest.value
      if (val.systolic < 120 && val.diastolic < 80) {
        list.push({ type: 'good', title: 'Blood Pressure Normal', description: `${val.systolic}/${val.diastolic} mmHg is within normal range.`, category: 'Vitals' })
      }
    }

    return list
  }, [labResults, vitals, medications, allergies, genetics])

  const watchItems = insights.filter(i => i.type === 'watch')
  const goodItems = insights.filter(i => i.type === 'good')
  const infoItems = insights.filter(i => i.type === 'info')

  const renderInsight = (insight, i) => {
    const config = typeConfig[insight.type]
    const Icon = config.icon
    return (
      <div key={i} className={`glass rounded-2xl p-5 border ${config.border} hover:bg-bg-hover transition-all`}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-xl ${config.bg} shrink-0`}>
            <Icon size={18} strokeWidth={1.5} className={config.color} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-text-primary">{insight.title}</h3>
              <span className={`px-2 py-0.5 rounded-md text-xs ${config.bg} ${config.color}`}>{insight.category}</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed mt-2">{insight.description}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Health Insights</h1>
          <p className="text-sm text-text-muted mt-1">AI-analyzed findings from your health records</p>
        </div>
        <span className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-xs">
          <Lightbulb size={14} strokeWidth={1.5} className="text-accent-amber" />
          {insights.length} insights
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass rounded-2xl p-5 border border-accent-amber/10">
          <div className="flex items-center gap-3 mb-2"><AlertTriangle size={16} strokeWidth={1.5} className="text-accent-amber" /><span className="text-xs text-text-muted uppercase tracking-wider">Needs Attention</span></div>
          <span className="text-3xl font-light text-accent-amber">{watchItems.length}</span>
        </div>
        <div className="glass rounded-2xl p-5 border border-accent-green/10">
          <div className="flex items-center gap-3 mb-2"><TrendingUp size={16} strokeWidth={1.5} className="text-accent-green" /><span className="text-xs text-text-muted uppercase tracking-wider">Positive</span></div>
          <span className="text-3xl font-light text-accent-green">{goodItems.length}</span>
        </div>
        <div className="glass rounded-2xl p-5 border border-accent-blue/10">
          <div className="flex items-center gap-3 mb-2"><Info size={16} strokeWidth={1.5} className="text-accent-blue" /><span className="text-xs text-text-muted uppercase tracking-wider">Informational</span></div>
          <span className="text-3xl font-light text-accent-blue">{infoItems.length}</span>
        </div>
      </div>

      {watchItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-accent-amber uppercase tracking-wider font-medium flex items-center gap-2"><AlertTriangle size={12} strokeWidth={1.5} />Requires Monitoring</h2>
          <div className="space-y-3">{watchItems.map(renderInsight)}</div>
        </div>
      )}
      {goodItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-accent-green uppercase tracking-wider font-medium flex items-center gap-2"><CheckCircle size={12} strokeWidth={1.5} />Positive Findings</h2>
          <div className="space-y-3">{goodItems.map(renderInsight)}</div>
        </div>
      )}
      {infoItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs text-accent-blue uppercase tracking-wider font-medium flex items-center gap-2"><Info size={12} strokeWidth={1.5} />Good to Know</h2>
          <div className="space-y-3">{infoItems.map(renderInsight)}</div>
        </div>
      )}
    </div>
  )
}
