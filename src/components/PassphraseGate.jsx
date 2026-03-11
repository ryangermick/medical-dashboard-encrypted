import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Lock, Eye, EyeOff, LogOut, Copy, Check, KeyRound } from 'lucide-react'

function getPassphraseStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '', hint: '' }
  let score = 0

  if (pw.length >= 12) score++
  if (pw.length >= 16) score++
  if (pw.length >= 24) score++

  const hasLower = /[a-z]/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasDigit = /\d/.test(pw)
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw)
  if (hasLower && hasUpper) score++
  if (hasDigit || hasSymbol) score++

  const wordCount = pw.trim().split(/\s+/).filter(w => w.length > 1).length
  if (wordCount >= 4) score += 2
  else if (wordCount >= 3) score++

  if (/^(.)\1+$/.test(pw) || /^(012|123|234|345|456|567|678|789|abc|password|qwerty)/i.test(pw)) score = Math.max(0, score - 3)

  const levels = [
    { label: 'Very weak', color: 'bg-accent-red' },
    { label: 'Weak', color: 'bg-accent-red' },
    { label: 'Fair', color: 'bg-accent-amber' },
    { label: 'Good', color: 'bg-accent-amber' },
    { label: 'Strong', color: 'bg-accent-green' },
    { label: 'Very strong', color: 'bg-accent-green' },
    { label: 'Excellent', color: 'bg-accent-green' },
  ]
  const idx = Math.min(score, levels.length - 1)

  let hint = ''
  if (pw.length < 12) hint = `Need ${12 - pw.length} more characters`
  else if (wordCount < 3 && pw.length < 20) hint = 'Try 4+ random words for stronger entropy'
  else if (score < 4) hint = 'Add more words or mix in numbers/symbols'

  return { score, max: levels.length, label: levels[idx].label, color: levels[idx].color, hint }
}

export default function PassphraseGate() {
  const { hasPassphrase, setupPassphrase, unlock, recoverWithCode } = useData()
  const { user, signOut } = useAuth()
  const [input, setInput] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  // Recovery key display (after setup)
  const [recoveryCode, setRecoveryCode] = useState(null)
  const [copiedRecovery, setCopiedRecovery] = useState(false)
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false)
  // Recovery flow (forgot passphrase)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryInput, setRecoveryInput] = useState('')
  const [recoveredPassphrase, setRecoveredPassphrase] = useState(null)

  const isSetup = hasPassphrase === false
  const strength = useMemo(() => getPassphraseStrength(input), [input])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSetup) {
        if (input.length < 12) {
          setError('Passphrase must be at least 12 characters — this protects your medical data')
          setLoading(false)
          return
        }
        if (input !== confirm) {
          setError('Passphrases do not match')
          setLoading(false)
          return
        }
        const code = await setupPassphrase(input)
        if (code) {
          setRecoveryCode(code)
          // Don't clear input yet — user needs to save recovery code first
        }
      } else {
        const valid = await unlock(input)
        if (!valid) setError('Incorrect passphrase')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await recoverWithCode(recoveryInput.trim().toLowerCase())
      if (result) {
        setRecoveredPassphrase(result)
      } else {
        setError('Invalid recovery code')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyRecoveryCode = async () => {
    await navigator.clipboard.writeText(recoveryCode)
    setCopiedRecovery(true)
    setTimeout(() => setCopiedRecovery(false), 2000)
  }

  // ---- Recovery Code Display (after setup) ----
  if (recoveryCode && !recoveryAcknowledged) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 flex items-center justify-center mx-auto mb-3">
              <KeyRound size={24} strokeWidth={1.5} className="text-accent-green" />
            </div>
            <h2 className="text-lg font-medium text-text-primary">Save Your Recovery Code</h2>
            <p className="text-text-muted text-sm mt-1">
              This is your emergency backup. Write it down or print it. It will <strong className="text-accent-amber">never be shown again</strong>.
            </p>
          </div>

          <div className="bg-bg-tertiary border border-border-primary rounded-xl p-4 mb-4">
            <p className="font-mono text-sm text-accent-green text-center leading-relaxed tracking-wide select-all">
              {recoveryCode}
            </p>
          </div>

          <button
            onClick={copyRecoveryCode}
            className="w-full py-2.5 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary text-sm hover:bg-bg-secondary transition-all flex items-center justify-center gap-2 mb-4"
          >
            {copiedRecovery ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy to clipboard</>}
          </button>

          <div className="p-3 rounded-xl bg-accent-amber/5 border border-accent-amber/10 mb-4">
            <p className="text-xs text-accent-amber">
              ⚠️ If you lose both your passphrase AND this recovery code, your data is permanently irrecoverable. Store them separately.
            </p>
          </div>

          <button
            onClick={() => {
              setRecoveryAcknowledged(true)
              setRecoveryCode(null)
              setInput('')
              setConfirm('')
            }}
            className="w-full py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white font-medium text-sm transition-all"
          >
            I've saved my recovery code — Continue
          </button>
        </div>
      </div>
    )
  }

  // ---- Recovered Passphrase Display ----
  if (recoveredPassphrase) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 flex items-center justify-center mx-auto mb-3">
              <Check size={24} strokeWidth={1.5} className="text-accent-green" />
            </div>
            <h2 className="text-lg font-medium text-text-primary">Recovery Successful</h2>
            <p className="text-text-muted text-sm mt-1">Your data has been unlocked. Here's your passphrase — save it this time!</p>
          </div>

          <div className="bg-bg-tertiary border border-border-primary rounded-xl p-4 mb-4">
            <p className="font-mono text-sm text-accent-green text-center select-all">{recoveredPassphrase}</p>
          </div>

          <button
            onClick={() => setRecoveredPassphrase(null)}
            className="w-full py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white font-medium text-sm transition-all"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ---- Recovery Input Flow ----
  if (showRecovery) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-accent-amber/10 flex items-center justify-center mx-auto mb-3">
              <KeyRound size={24} strokeWidth={1.5} className="text-accent-amber" />
            </div>
            <h2 className="text-lg font-medium text-text-primary">Enter Recovery Code</h2>
            <p className="text-text-muted text-sm mt-1">Enter the 8-word recovery code you saved during setup.</p>
          </div>

          <form onSubmit={handleRecover} className="space-y-4">
            <input
              type="text"
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              placeholder="word-word-word-word-word-word-word-word"
              className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-amber/50 transition-all font-mono"
              autoFocus
            />

            {error && <p className="text-accent-red text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading || !recoveryInput.trim()}
              className="w-full py-3 rounded-xl bg-accent-amber hover:bg-accent-amber/80 text-white font-medium text-sm disabled:opacity-50 transition-all"
            >
              {loading ? 'Recovering...' : 'Recover My Data'}
            </button>
          </form>

          <button
            onClick={() => { setShowRecovery(false); setError(null); setRecoveryInput('') }}
            className="w-full mt-3 py-2 text-text-muted text-xs hover:text-text-secondary transition-all"
          >
            ← Back to passphrase unlock
          </button>
        </div>
      </div>
    )
  }

  // ---- Main Passphrase Form ----
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-0 mb-2">
            <span className="text-3xl text-text-primary" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>Med</span>
            <span className="text-3xl font-semibold text-accent-blue mx-0.5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>+</span>
            <span className="text-3xl text-text-primary" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>Dash</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mt-4 mb-3">
            <Lock size={24} strokeWidth={1.5} className="text-accent-blue" />
          </div>
          <h2 className="text-lg font-medium text-text-primary">
            {isSetup ? 'Create Encryption Passphrase' : 'Unlock Your Data'}
          </h2>
          <p className="text-text-muted text-sm mt-1">
            {isSetup
              ? 'Use 4+ random words (e.g. "purple tiger morning shelf"). A recovery code will be generated.'
              : 'Enter your passphrase to decrypt your medical records.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" autoComplete="username" value={user?.email || ''} readOnly className="sr-only" tabIndex={-1} aria-hidden="true" />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSetup ? 'e.g. correct horse battery staple' : 'Enter your passphrase'}
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50 transition-all pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {isSetup && input && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < Math.ceil(strength.score * 6 / strength.max) ? strength.color : 'bg-bg-tertiary'}`} />
                ))}
              </div>
              <p className="text-xs text-text-muted">{strength.label}{strength.hint ? ` — ${strength.hint}` : ''}</p>
            </div>
          )}

          {isSetup && (
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm passphrase"
              autoComplete="new-password"
              className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50 transition-all"
            />
          )}

          {error && <p className="text-accent-red text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !input}
            className="w-full py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white font-medium text-sm disabled:opacity-50 transition-all"
          >
            {loading ? 'Processing...' : isSetup ? 'Set Passphrase & Continue' : 'Unlock'}
          </button>
        </form>

        {isSetup && (
          <div className="mt-4 p-3 rounded-xl bg-accent-amber/5 border border-accent-amber/10">
            <p className="text-xs text-accent-amber">
              ⚠️ A recovery code will be generated on the next screen. You'll need either your passphrase or recovery code to access your data.
            </p>
          </div>
        )}

        {!isSetup && (
          <button
            onClick={() => setShowRecovery(true)}
            className="w-full mt-3 py-2 text-text-muted text-xs hover:text-accent-amber transition-all flex items-center justify-center gap-1.5"
          >
            <KeyRound size={12} />
            Forgot passphrase? Use recovery code
          </button>
        )}

        <div className="mt-6 pt-4 border-t border-border-primary text-center">
          {user && (
            <p className="text-text-muted text-xs mb-2">
              Signed in as <span className="text-text-secondary">{user.email}</span>
            </p>
          )}
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 text-text-muted text-xs hover:text-text-secondary transition-all"
          >
            <LogOut size={12} />
            Switch account
          </button>
        </div>
      </div>
    </div>
  )
}
