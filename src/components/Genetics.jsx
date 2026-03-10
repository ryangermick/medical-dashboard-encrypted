import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { Dna, AlertTriangle, CheckCircle, Shield, Pill, Fingerprint } from 'lucide-react'

const RiskBadge = ({ status }) => {
  const config = {
    normal: { label: 'Average', color: 'text-text-muted', bg: 'bg-bg-tertiary' },
    watch: { label: 'Monitor', color: 'text-accent-amber', bg: 'bg-accent-amber/10' },
    good: { label: 'Low Risk', color: 'text-accent-green', bg: 'bg-accent-green/10' },
    elevated: { label: 'Elevated', color: 'text-accent-red', bg: 'bg-accent-red/10' },
  }
  const { label, color, bg } = config[status] || config.normal
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${color} ${bg}`}>{label}</span>
}

export default function Genetics() {
  const { genetics } = useData()

  const gData = useMemo(() => {
    if (!genetics) return null
    const d = typeof genetics.data === 'string' ? JSON.parse(genetics.data) : genetics.data
    return d
  }, [genetics])

  if (!genetics || !gData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Genomics</h1>
        <p className="text-text-muted">No genetic data yet. Upload genetic results or load demo data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Genomics</h1>
          <p className="text-sm text-text-muted mt-1">{genetics.provider} • {genetics.sequence_date} • {genetics.coverage} coverage</p>
        </div>
        <div className="glass rounded-xl px-4 py-2">
          <span className="text-xs text-text-muted">{genetics.snps_analyzed} SNPs analyzed</span>
        </div>
      </div>

      {/* Ancestry */}
      {gData.ancestry && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Fingerprint size={14} strokeWidth={1.5} /> Ancestry Composition
          </h3>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4">
            <div className="bg-accent-blue" style={{ width: `${gData.ancestry.british}%` }} />
            <div className="bg-accent-purple" style={{ width: `${gData.ancestry.german}%` }} />
            <div className="bg-accent-cyan" style={{ width: `${gData.ancestry.scandinavian}%` }} />
            <div className="bg-accent-amber" style={{ width: `${gData.ancestry.eastAsian}%` }} />
            <div className="bg-accent-green" style={{ width: `${gData.ancestry.subSaharanAfrican}%` }} />
            <div className="bg-accent-red" style={{ width: `${gData.ancestry.nativeAmerican}%` }} />
            <div className="bg-text-muted" style={{ width: `${gData.ancestry.other}%` }} />
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-blue" />British & Irish {gData.ancestry.british}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-purple" />German {gData.ancestry.german}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-cyan" />Scandinavian {gData.ancestry.scandinavian}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-amber" />East Asian {gData.ancestry.eastAsian}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green" />Sub-Saharan African {gData.ancestry.subSaharanAfrican}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-text-muted" />Other European {gData.ancestry.other}%</span>
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {gData.riskFactors && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Dna size={14} strokeWidth={1.5} /> Disease Risk Factors
          </h3>
          <div className="space-y-2">
            {gData.riskFactors.map((rf, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                rf.status === 'watch' ? 'bg-accent-amber/5 border border-accent-amber/10' : 'bg-bg-tertiary hover:bg-bg-hover'
              }`}>
                <div className="flex items-center gap-4 flex-1">
                  {rf.status === 'watch' ? <AlertTriangle size={16} strokeWidth={1.5} className="text-accent-amber shrink-0" />
                    : rf.status === 'good' ? <Shield size={16} strokeWidth={1.5} className="text-accent-green shrink-0" />
                    : <CheckCircle size={16} strokeWidth={1.5} className="text-text-muted shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">{rf.condition}</p>
                    <p className="text-xs text-text-muted mt-0.5">{rf.gene} • <span className="font-mono">{rf.snp}</span>{rf.genotype && <> • {rf.genotype}</>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-text-secondary">{rf.odds}</span>
                  <RiskBadge status={rf.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pharmacogenomics */}
      {gData.pharmacogenomics && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Pill size={14} strokeWidth={1.5} /> Pharmacogenomics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gData.pharmacogenomics.map((pg, i) => (
              <div key={i} className="bg-bg-tertiary rounded-xl p-4 hover:bg-bg-hover transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-primary font-medium">{pg.drug}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    pg.metabolism === 'Normal' ? 'bg-accent-green/10 text-accent-green' :
                    pg.metabolism === 'Rapid' ? 'bg-accent-amber/10 text-accent-amber' :
                    'bg-accent-red/10 text-accent-red'
                  }`}>{pg.metabolism}</span>
                </div>
                <p className="text-xs text-text-muted">{pg.gene}</p>
                <p className="text-xs text-text-secondary mt-1">{pg.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traits */}
      {gData.traits && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Trait Analysis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {gData.traits.map((trait, i) => (
              <div key={i} className="bg-bg-tertiary rounded-xl p-4 hover:bg-bg-hover transition-all">
                <p className="text-xs text-text-muted mb-1">{trait.gene}</p>
                <p className="text-sm text-text-primary font-medium">{trait.trait}</p>
                <p className="text-sm text-accent-cyan mt-1">{trait.result}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
