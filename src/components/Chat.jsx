import { safeJsonParse } from '../lib/crypto'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Send, Bot, User, Loader2, Plus, Trash2, MessageCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import * as db from '../lib/db'

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
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function buildSystemPrompt(patient, vitals, labResults, medications, allergies, genetics) {
  let prompt = `You are MedDash AI, a personal health assistant. Be helpful, clear, and conversational. Note you're not a replacement for professional medical advice.\n\n`

  if (patient) {
    prompt += `PATIENT: ${patient.name}, ${patient.age}yo ${patient.sex}, ${patient.height}, ${patient.weight}, BMI ${patient.bmi}, Blood Type: ${patient.blood_type}\n`
    prompt += `Primary Physician: ${patient.primary_physician}, Insurance: ${patient.insurance}\n\n`
  }

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

  if (labResults.length) {
    prompt += 'LAB RESULTS:\n'
    labResults.forEach(lab => {
      const results = typeof lab.results === 'string' ? safeJsonParse(lab.results) : lab.results
      if (Array.isArray(results)) {
        prompt += `${lab.panel_name} (${lab.panel_abbr}, drawn ${lab.drawn_date}):\n`
        results.forEach(r => prompt += `  - ${r.name}: ${r.value} ${r.unit} (${r.status}, range: ${r.range})\n`)
      }
    })
    prompt += '\n'
  }

  if (medications.length) {
    prompt += 'MEDICATIONS:\n'
    medications.forEach(m => prompt += `- ${m.name} ${m.dose} (${m.frequency}) — ${m.purpose} [${m.active ? 'active' : 'discontinued'}]\n`)
    prompt += '\n'
  }

  if (allergies.length) {
    prompt += 'ALLERGIES:\n'
    allergies.forEach(a => prompt += `- ${a.allergen}: ${a.reaction} (${a.severity})\n`)
    prompt += '\n'
  }

  if (genetics) {
    const gData = typeof genetics.data === 'string' ? safeJsonParse(genetics.data) : genetics.data
    if (gData) {
      prompt += 'GENETICS:\n'
      if (gData.riskFactors) {
        prompt += 'Risk Factors:\n'
        gData.riskFactors.forEach(rf => prompt += `- ${rf.condition}: ${rf.odds} risk (${rf.gene} ${rf.snp}, ${rf.status})\n`)
      }
      if (gData.pharmacogenomics) {
        prompt += 'Pharmacogenomics:\n'
        gData.pharmacogenomics.forEach(pg => prompt += `- ${pg.drug}: ${pg.metabolism} metabolizer (${pg.gene}) — ${pg.note}\n`)
      }
      prompt += '\n'
    }
  }

  return prompt
}

export default function Chat() {
  const { patient, vitals, labResults, medications, allergies, genetics, passphrase } = useData()
  const { user } = useAuth()
  const location = useLocation()
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const prefillHandled = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Load sessions on mount
  useEffect(() => {
    if (!user || !passphrase) return
    db.getChatSessions(user.id).then(s => {
      setSessions(s)
      setSessionsLoaded(true)
      if (s.length > 0) {
        setActiveSessionId(s[0].id)
      }
    })
  }, [user, passphrase])

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId || !user || !passphrase) { setMessages([]); return }
    db.getChatMessages(activeSessionId, user.id, passphrase).then(msgs => {
      setMessages(msgs.map(m => ({ role: m.role, content: m.content })))
    })
  }, [activeSessionId, user, passphrase])

  // Handle prefilled question from flag modal
  useEffect(() => {
    if (location.state?.prefill && !prefillHandled.current) {
      prefillHandled.current = true
      setInput(location.state.prefill)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const startNewChat = async () => {
    const session = await db.createChatSession(user.id, 'New Chat')
    setSessions(prev => [session, ...prev])
    setActiveSessionId(session.id)
    setMessages([])
  }

  const deleteSession = async (id) => {
    await db.deleteChatSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id)
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null)
      if (!remaining.length) setMessages([])
    }
  }

  const switchSession = (id) => {
    setActiveSessionId(id)
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const trimmed = text.trim()

    // Auto-create session if none
    let sessionId = activeSessionId
    if (!sessionId) {
      const session = await db.createChatSession(user.id, trimmed.slice(0, 60))
      setSessions(prev => [session, ...prev])
      setActiveSessionId(session.id)
      sessionId = session.id
    }

    const userMsg = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Save user message encrypted
    await db.saveChatMessage(sessionId, user.id, 'user', trimmed, passphrase)

    // Update session title from first message
    if (messages.length === 0) {
      await db.updateChatSessionTitle(sessionId, trimmed.slice(0, 60))
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: trimmed.slice(0, 60) } : s))
    }

    try {
      const systemPrompt = buildSystemPrompt(patient, vitals, labResults, medications, allergies, genetics)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, systemPrompt }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const assistantMsg = { role: 'assistant', content: data.response }
      setMessages([...newMessages, assistantMsg])
      // Save assistant message encrypted
      await db.saveChatMessage(sessionId, user.id, 'assistant', data.response, passphrase)
    } catch (err) {
      const errMsg = { role: 'assistant', content: `**Error:** ${err.message}` }
      setMessages([...newMessages, errMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Sidebar - chat sessions */}
      <div className="w-56 border-r border-border-primary flex flex-col shrink-0 hidden lg:flex">
        <button
          onClick={startNewChat}
          className="flex items-center gap-2 m-3 px-3 py-2 rounded-xl bg-accent-purple/10 text-accent-purple text-sm font-medium hover:bg-accent-purple/20 transition-all"
        >
          <Plus size={16} /> New Chat
        </button>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => switchSession(s.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                s.id === activeSessionId ? 'bg-bg-tertiary text-text-primary' : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
              }`}
            >
              <MessageCircle size={14} className="shrink-0" />
              <span className="truncate flex-1">{s.title || 'New Chat'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-accent-red transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Health Assistant</h1>
            <p className="text-xs text-text-muted">E2E encrypted chat history</p>
          </div>
          <button onClick={startNewChat} className="lg:hidden p-2 rounded-lg hover:bg-bg-hover text-text-muted">
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 p-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-4">
                <Bot size={28} strokeWidth={1.5} className="text-accent-purple" />
              </div>
              <h2 className="text-lg font-medium text-text-primary mb-2">Ask about your health</h2>
              <p className="text-sm text-text-muted max-w-md mb-8">
                Your conversations are encrypted with your passphrase and saved securely.
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

        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="shrink-0 px-4 py-3 border-t border-border-primary">
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
    </div>
  )
}
