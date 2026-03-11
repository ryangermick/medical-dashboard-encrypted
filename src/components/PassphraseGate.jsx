import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Lock, Eye, EyeOff, LogOut } from 'lucide-react'

function getPassphraseStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 12) score++
  if (pw.length >= 16) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (pw.length >= 20) score++
  // Penalize common patterns
  if (/^(.)\1+$/.test(pw) || /^(012|123|234|345|456|567|678|789|abc|password|qwerty)/i.test(pw)) score = Math.max(0, score - 2)
  const levels = [
    { label: 'Very weak', color: 'bg-accent-red' },
    { label: 'Weak', color: 'bg-accent-red' },
    { label: 'Fair', color: 'bg-accent-amber' },
    { label: 'Good', color: 'bg-accent-amber' },
    { label: 'Strong', color: 'bg-accent-green' },
    { label: 'Very strong', color: 'bg-accent-green' },
  ]
  const idx = Math.min(score, levels.length - 1)
  return { score, max: levels.length, label: levels[idx].label, color: levels[idx].color }
}

export default function PassphraseGate() {
  const { hasPassphrase, setupPassphrase, unlock } = useData()
  const { user, signOut } = useAuth()
  const [input, setInput] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

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
        await setupPassphrase(input)
      } else {
        const valid = await unlock(input)
        if (!valid) {
          setError('Incorrect passphrase')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
              ? 'This passphrase encrypts all your medical data. Write it down — it cannot be recovered.'
              : 'Enter your passphrase to decrypt your medical records.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSetup ? 'Create a strong passphrase' : 'Enter your passphrase'}
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < Math.ceil(strength.score * 5 / strength.max) ? strength.color : 'bg-bg-tertiary'}`} />
                ))}
              </div>
              <p className="text-xs text-text-muted">{strength.label}{input.length < 12 ? ` — need ${12 - input.length} more characters` : ''}</p>
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
              ⚠️ If you lose this passphrase, your data cannot be recovered. There is no reset option.
            </p>
          </div>
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
