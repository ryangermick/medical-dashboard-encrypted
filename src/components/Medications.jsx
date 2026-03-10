import { useData } from '../context/DataContext'
import { Pill, AlertOctagon, CheckCircle } from 'lucide-react'

export default function Medications() {
  const { medications, allergies } = useData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Rx & Allergies</h1>
        <p className="text-sm text-text-muted mt-1">Current medications and allergy records</p>
      </div>

      {/* Active Medications */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Pill size={14} strokeWidth={1.5} />
          Active Medications ({medications.filter(m => m.active).length})
        </h3>
        {medications.length === 0 ? (
          <p className="text-sm text-text-muted">No medications recorded.</p>
        ) : (
          <div className="space-y-2">
            {medications.filter(m => m.active).map((med, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-bg-tertiary rounded-xl hover:bg-bg-hover transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                    <Pill size={18} strokeWidth={1.5} className="text-accent-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-text-primary font-medium">{med.name}</p>
                    <p className="text-xs text-text-muted">{med.purpose} • Since {med.start_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-text-primary font-mono">{med.dose}</p>
                    <p className="text-xs text-text-muted">{med.frequency}</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-accent-green/10 text-accent-green text-xs font-medium">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Allergies */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertOctagon size={14} strokeWidth={1.5} className="text-accent-red" />
          <span className="text-accent-red">Allergies ({allergies.length})</span>
        </h3>
        {allergies.length === 0 ? (
          <p className="text-sm text-text-muted">No known allergies.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allergies.map((allergy, i) => (
              <div key={i} className="p-4 rounded-xl border border-accent-red/20 bg-accent-red/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-primary font-semibold">{allergy.allergen}</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    allergy.severity === 'Severe' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-amber/10 text-accent-amber'
                  }`}>{allergy.severity}</span>
                </div>
                <p className="text-xs text-text-muted">Reaction: {allergy.reaction}</p>
                <p className="text-xs text-text-muted mt-1">{allergy.confirmed ? 'Confirmed' : 'Suspected'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
