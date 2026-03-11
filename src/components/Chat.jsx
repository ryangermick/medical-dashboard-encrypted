import { safeJsonParse } from '../lib/crypto'
import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const SUGGESTED = [
  "What should I focus on to improve my health?",
  "Explain my cholesterol results",
  "What does my genetic data mean for me?",
  "Am I at risk for diabetes?",
  "What medications interact with my genetics?",
  "Summarize my health status",
]

function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-lg font-semibold text-text-primary mt-3 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold text-text-primary mt-3 mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-text-primary mt-2.5 mb-1">{children}</h3>,
        p: ({ children }) => <p className="text-sm text-text-secondary leading-relaxed mb-2">{children}</p>,
        strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="space-y-1 mb-2 ml-1">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1 mb-2 ml-1 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-2 text-sm text-text-secondary">
            <span className="text-accent-blue mt-0.5 shrink-0">•</span>
            <span className="leading-relaxed">{children}</span>
          </li>
        ),
        code: ({ inline, children }) => inline
          ? <code className="px-1.5 py-0.5 rounded bg-bg-tertiary text-accent-cyan text-xs font-mono">{children}</code>
          : <pre className="bg-bg-tertiary rounded-lg p-3 text-xs font-mono text-text-secondary overflow-x-auto mb-2"><code>{children}</code></pre>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// Build system prompt from decrypted data
function buildSystemPrompt(patient, vitals, labResults, medications, allergies, genetics) {
  let prompt = `You are MedDash AI, a personal health assistant. Be helpful, clear, and conversational. Note you're not a replacement for professional medical advice.\n\n`

  if (patient) {
    prompt += `PATIENT: ${patient.name}, ${patient.age}yo ${patient.sex}, ${patient.height}, ${patient.weight}, BMI ${patient.bmi}, Blood Type: ${patient.blood_type}\n`
    prompt += `Primary Physician: ${patient.primary_physician}, Insurance: ${patient.insurance}\n\n`
  }

  // Latest vitals
  const latestVitals = {}
  vitals.forEach(v => {
    if (!latestVitals[v.vital_type] || new Date(v.recorded_at) > new Date(latestVitals[v.vital_type].recorded_at)) {
      latestVitals[v.vital_type] = v
    }
  })
  if (Object.keys(latestVitals).length) {
    prompt += 'CURRENT VITALS:\n'
    for (const [type, v] of Object.entries(latestVitals)) {
      const val = typeof v.value === 'string' ? safeJsonParse(v.value) : v.value
      if (type === 'blood_pressure') prompt += `- Blood Pressure: ${val.systolic}/${val.diastolic} ${v.unit} (${v.status})\n`
      else prompt += `- ${type.replace(/_/g, ' ')}: ${val.avg ?? val.value ?? JSON.stringify(val)} ${v.unit} (${v.status})\n`
    }
    prompt += '\n'
  }

  // Lab results
  if (labResults.length) {
    prompt += 'BLOOD WORK:\n'
    labResults.forEach(lab => {
      const results = typeof lab.results === 'string' ? safeJsonParse(lab.results) : lab.results
      const panelName = typeof lab.panel_name === 'string' ? lab.panel_name : 'Panel'
      prompt += `\n${panelName} (${lab.drawn_date}):\n`
      if (Array.isArray(results)) {
        results.forEach(r => {
          prompt += `- ${r.name}: ${r.value} ${r.unit} (${r.status}, range: ${r.range})\n`
        })
      }
    })
    prompt += '\n'
  }

  // Medications
  if (medications.length) {
    prompt += 'MEDICATIONS:\n'
    medications.filter(m => m.active).forEach(m => {
      prompt += `- ${m.name} ${m.dose} ${m.frequency} (${m.purpose}, since ${m.start_date})\n`
    })
    prompt += '\n'
  }

  // Allergies
  if (allergies.length) {
    prompt += 'ALLERGIES:\n'
    allergies.forEach(a => {
      prompt += `- ${a.allergen}: ${a.severity} — ${a.reaction}\n`
    })
    prompt += '\n'
  }

  // Genetics
  if (genetics) {
    const gData = typeof genetics.data === 'string' ? safeJsonParse(genetics.data) : genetics.data
    if (gData) {
      prompt += `GENETICS (${genetics.provider}, ${genetics.coverage} coverage):\n`
      if (gData.riskFactors) {
        prompt += 'Risk Factors:\n'
        gData.riskFactors.forEach(rf => {
          prompt += `- ${rf.condition}: ${rf.odds} risk (${rf.gene} ${rf.snp}, ${rf.status})\n`
        })
      }
      if (gData.pharmacogenomics) {
        prompt += 'Pharmacogenomics:\n'
        gData.pharmacogenomics.forEach(pg => {
          prompt += `- ${pg.drug}: ${pg.metabolism} metabolizer (${pg.gene}) — ${pg.note}\n`
        })
      }
      prompt += '\n'
    }
  }

  return prompt
}

export default function Chat() {
  const { patient, vitals, labResults, medications, allergies, genetics } = useData()
  const location = useLocation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const prefillHandled = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Handle prefilled question from flag modal
  useEffect(() => {
    if (location.state?.prefill && !prefillHandled.current) {
      prefillHandled.current = true
      setInput(location.state.prefill)
      // Auto-clear the state so refresh doesn't re-trigger
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(patient, vitals, labResults, medications, allergies, genetics)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, systemPrompt }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([...newMessages, { role: 'assistant', content: data.response }])
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `**Error:** ${err.message}` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Health Assistant</h1>
          <p className="text-sm text-text-muted mt-1">AI-powered — uses your decrypted records (never stored server-side)</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-4">
              <Bot size={28} strokeWidth={1.5} className="text-accent-purple" />
            </div>
            <h2 className="text-lg font-medium text-text-primary mb-2">Ask about your health</h2>
            <p className="text-sm text-text-muted max-w-md mb-8">
              I have context from your decrypted medical records. Your data is sent only for this conversation and never stored on the server.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTED.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} className="text-left text-sm text-text-secondary px-4 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border-primary hover:border-border-hover transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-accent-purple/10 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} strokeWidth={1.5} className="text-accent-purple" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-accent-blue text-white' : 'glass'}`}>
              {msg.role === 'assistant' ? <MarkdownMessage content={msg.content} /> : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent-purple/10 flex items-center justify-center shrink-0 mt-1">
              <Bot size={16} strokeWidth={1.5} className="text-accent-purple" />
            </div>
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="text-accent-purple animate-spin" />
              <span className="text-sm text-text-muted">Analyzing your records...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="shrink-0 pt-4 border-t border-border-primary">
        <div className="flex gap-3">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health records..." disabled={loading}
            className="flex-1 bg-bg-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/50 transition-all" />
          <button type="submit" disabled={!input.trim() || loading}
            className="px-4 py-3 rounded-xl bg-accent-purple hover:bg-accent-purple/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <Send size={18} strokeWidth={1.5} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2 text-center">AI analysis is not a substitute for professional medical advice</p>
      </form>
    </div>
  )
}
