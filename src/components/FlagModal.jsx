import { X, AlertTriangle, MessageCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function FlagModal({ flag, onClose }) {
  const navigate = useNavigate()
  if (!flag) return null

  const chatAbout = () => {
    onClose()
    // Navigate to Ask AI with a pre-filled question about this flag
    navigate('/ask-ai', { state: { prefill: `Tell me about my ${flag.name || flag.title} result. It was ${flag.value} ${flag.unit || ''} (reference range: ${flag.range || 'N/A'}). What does this mean and should I be concerned?` } })
  }

  const severity = flag.status === 'high' ? 'High' : flag.status === 'elevated' ? 'Elevated' : 'Flagged'
  const numVal = parseFloat(flag.value)
  const rangeParts = flag.range?.includes('-') ? flag.range.split('-').map(s => parseFloat(s)) : null
  const isAbove = rangeParts && numVal > rangeParts[1]
  const isBelow = rangeParts && numVal < rangeParts[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center">
              <AlertTriangle size={20} strokeWidth={1.5} className="text-accent-amber" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{flag.name || flag.title}</h2>
              <span className="px-2 py-0.5 rounded-md bg-accent-amber/10 text-accent-amber text-xs font-medium">{severity}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted">
            <X size={18} />
          </button>
        </div>

        {/* Value display */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted uppercase tracking-wider">Your Result</span>
            <div className="flex items-center gap-1">
              {isAbove ? <TrendingUp size={14} className="text-accent-amber" /> : isBelow ? <TrendingDown size={14} className="text-accent-amber" /> : <Minus size={14} className="text-text-muted" />}
              <span className="text-xs text-accent-amber">{isAbove ? 'Above range' : isBelow ? 'Below range' : 'Out of range'}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-light text-accent-amber">{flag.value}</span>
            <span className="text-sm text-text-muted">{flag.unit}</span>
          </div>
          {flag.range && (
            <p className="text-xs text-text-muted mt-2">Normal range: <span className="text-text-secondary">{flag.range}</span> {flag.unit}</p>
          )}
        </div>

        {/* Context */}
        {flag.panel && (
          <div className="glass rounded-xl p-4 mb-4">
            <span className="text-xs text-text-muted uppercase tracking-wider">From Panel</span>
            <p className="text-sm text-text-primary mt-1">{flag.panel}</p>
            {flag.drawn_date && <p className="text-xs text-text-muted mt-1">Drawn: {flag.drawn_date}</p>}
          </div>
        )}

        {/* What it means - brief */}
        <div className="glass rounded-xl p-4 mb-5">
          <span className="text-xs text-text-muted uppercase tracking-wider">Why It's Flagged</span>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            Your {flag.name || flag.title} of <strong>{flag.value} {flag.unit}</strong> is {isAbove ? 'above' : isBelow ? 'below' : 'outside'} the
            normal reference range{flag.range ? ` of ${flag.range} ${flag.unit}` : ''}. Consult your physician for personalized advice.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={chatAbout}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white text-sm font-medium transition-all"
          >
            <MessageCircle size={16} />
            Ask AI About This
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover text-text-muted text-sm transition-all border border-border-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
