import { safeJsonParse } from '../lib/crypto'
import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { Droplets, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'

const StatusBar = ({ value, range, status }) => {
  let min = 0, max = 100, rangeMin = 0, rangeMax = 100
  const numVal = parseFloat(value)
  if (range.includes('-')) {
    const parts = range.split('-').map(s => parseFloat(s))
    rangeMin = parts[0]; rangeMax = parts[1]
    min = rangeMin * 0.5; max = rangeMax * 1.5
  } else if (range.startsWith('<')) {
    rangeMax = parseFloat(range.slice(1)); rangeMin = 0; min = 0; max = rangeMax * 2
  } else if (range.startsWith('>')) {
    rangeMin = parseFloat(range.slice(1)); rangeMax = rangeMin * 3; min = 0; max = rangeMax
  }
  const position = Math.max(0, Math.min(100, ((numVal - min) / (max - min)) * 100))
  const rangeStart = ((rangeMin - min) / (max - min)) * 100
  const rangeEnd = ((rangeMax - min) / (max - min)) * 100

  return (
    <div className="relative h-1.5 bg-bg-tertiary rounded-full w-full">
      <div className="absolute h-full bg-accent-green/20 rounded-full" style={{ left: `${rangeStart}%`, width: `${rangeEnd - rangeStart}%` }} />
      <div className={`absolute w-2.5 h-2.5 rounded-full -top-[2px] transition-all ${
        status === 'normal' ? 'bg-accent-green' : status === 'elevated' ? 'bg-accent-amber' : 'bg-accent-red'
      }`} style={{ left: `${position}%`, transform: 'translateX(-50%)' }} />
    </div>
  )
}

export default function BloodWork() {
  const { labResults } = useData()
  const [expandedPanel, setExpandedPanel] = useState(0)

  const panels = useMemo(() => {
    return labResults.map(lab => {
      const results = typeof lab.results === 'string' ? safeJsonParse(lab.results) : lab.results
      return { ...lab, parsedResults: Array.isArray(results) ? results : [] }
    })
  }, [labResults])

  if (!panels.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Blood Work</h1>
        <p className="text-text-muted">No lab results yet. Upload medical records or load demo data.</p>
      </div>
    )
  }

  const totalNormal = panels.reduce((acc, p) => acc + p.parsedResults.filter(r => r.status === 'normal').length, 0)
  const totalElevated = panels.reduce((acc, p) => acc + p.parsedResults.filter(r => r.status !== 'normal').length, 0)
  const drawnDate = panels[0]?.drawn_date

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Blood Work</h1>
          <p className="text-sm text-text-muted mt-1">Last drawn: {drawnDate} • {panels.length} panels</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-accent-green/10 text-accent-green text-xs font-medium">{totalNormal} Normal</span>
          {totalElevated > 0 && <span className="px-3 py-1.5 rounded-lg bg-accent-amber/10 text-accent-amber text-xs font-medium">{totalElevated} Elevated</span>}
        </div>
      </div>

      <div className="space-y-3">
        {panels.map((panel, idx) => {
          const isExpanded = expandedPanel === idx
          const elevatedCount = panel.parsedResults.filter(r => r.status !== 'normal').length
          const panelName = typeof panel.panel_name === 'string' ? panel.panel_name : 'Panel'
          return (
            <div key={idx} className="glass rounded-2xl overflow-hidden">
              <button onClick={() => setExpandedPanel(isExpanded ? -1 : idx)} className="w-full flex items-center justify-between p-5 hover:bg-bg-hover transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                    <Droplets size={18} strokeWidth={1.5} className="text-accent-blue" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-text-primary">{panelName}</h3>
                    <p className="text-xs text-text-muted">{panel.panel_abbr} • {panel.parsedResults.length} markers</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {elevatedCount > 0 ? (
                    <span className="flex items-center gap-1 text-accent-amber text-xs"><AlertTriangle size={12} strokeWidth={1.5} />{elevatedCount} flagged</span>
                  ) : (
                    <span className="flex items-center gap-1 text-accent-green text-xs"><CheckCircle size={12} strokeWidth={1.5} />All normal</span>
                  )}
                  <ChevronRight size={16} className={`text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border-primary">
                  <div className="grid gap-0.5 mt-4">
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-text-muted uppercase tracking-wider">
                      <span className="col-span-3">Marker</span>
                      <span className="col-span-2 text-right">Value</span>
                      <span className="col-span-1">Unit</span>
                      <span className="col-span-4">Range</span>
                      <span className="col-span-2 text-right">Status</span>
                    </div>
                    {panel.parsedResults.map((result, rIdx) => (
                      <div key={rIdx} className={`sm:grid sm:grid-cols-12 gap-4 items-center px-4 py-3 rounded-xl ${result.status !== 'normal' ? 'bg-accent-amber/5' : 'hover:bg-bg-hover'} transition-all`}>
                        <span className="sm:col-span-3 text-sm text-text-primary font-medium block">{result.name}</span>
                        <span className={`sm:col-span-2 text-sm font-mono sm:text-right block ${result.status !== 'normal' ? 'text-accent-amber font-semibold' : 'text-text-primary'}`}>{result.value}</span>
                        <span className="sm:col-span-1 text-xs text-text-muted block">{result.unit}</span>
                        <div className="sm:col-span-4 flex items-center gap-3 my-1 sm:my-0">
                          <StatusBar value={result.value} range={result.range} status={result.status} />
                          <span className="text-xs text-text-muted whitespace-nowrap">{result.range}</span>
                        </div>
                        <div className="sm:col-span-2 flex sm:justify-end">
                          {result.status === 'normal' ? <CheckCircle size={14} strokeWidth={1.5} className="text-accent-green" /> : <AlertTriangle size={14} strokeWidth={1.5} className="text-accent-amber" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
