import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { loadDemoData } from '../lib/demoData'
import { Database, Loader2, CheckCircle, Trash2, Shield, Lock, Clock } from 'lucide-react'
import * as db from '../lib/db'

export default function Settings() {
  const { passphrase, loadAllData, patient } = useData()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [done, setDone] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearPassphrase, setClearPassphrase] = useState('')
  const [clearError, setClearError] = useState(null)

  const handleLoadDemo = async () => {
    if (!passphrase || !user) return
    setLoading(true)
    setDone(false)
    setProgress('')
    try {
      await loadDemoData(user.id, passphrase, setProgress)
      await loadAllData()
      setDone(true)
    } catch (err) {
      setProgress(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    // Require passphrase re-entry for destructive action
    if (clearPassphrase !== passphrase) {
      setClearError('Incorrect passphrase')
      return
    }
    setClearing(true)
    setClearError(null)
    try {
      await db.clearAllUserData(user.id)
      await loadAllData()
      setProgress('All data cleared.')
      setDone(false)
      setShowClearConfirm(false)
      setClearPassphrase('')
    } catch (err) {
      setProgress(`Error: ${err.message}`)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your data and encryption</p>
      </div>

      {/* Encryption Status */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield size={14} strokeWidth={1.5} className="text-accent-green" />
          Encryption Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg-tertiary rounded-xl p-4">
            <p className="text-xs text-text-muted">Algorithm</p>
            <p className="text-sm text-text-primary font-medium">AES-256-GCM</p>
          </div>
          <div className="bg-bg-tertiary rounded-xl p-4">
            <p className="text-xs text-text-muted">Key Derivation</p>
            <p className="text-sm text-text-primary font-medium">PBKDF2 (600K iterations)</p>
          </div>
          <div className="bg-bg-tertiary rounded-xl p-4">
            <p className="text-xs text-text-muted">Auto-Lock</p>
            <p className="text-sm text-accent-green font-medium flex items-center gap-1"><Clock size={12} /> 15 min inactivity</p>
          </div>
        </div>
      </div>

      {/* Demo Data */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Database size={14} strokeWidth={1.5} className="text-accent-blue" />
          Test Mode
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Load realistic demo data (Joe Stevens, 45yo male) to test all features.
          Data is encrypted and saved to your Supabase database.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleLoadDemo}
            disabled={loading || clearing}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/80 text-white font-medium text-sm disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            {loading ? 'Loading...' : 'Load Demo Data'}
          </button>

          {patient && !showClearConfirm && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={loading || clearing}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-accent-red/30 text-accent-red hover:bg-accent-red/10 font-medium text-sm disabled:opacity-50 transition-all"
            >
              <Trash2 size={16} />
              Clear All Data
            </button>
          )}
        </div>

        {showClearConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-accent-red/5 border border-accent-red/20 space-y-3">
            <div className="flex items-center gap-2 text-accent-red text-sm font-medium">
              <Lock size={14} /> Re-enter passphrase to confirm deletion
            </div>
            <p className="text-xs text-text-muted">This will permanently delete ALL your medical data. This cannot be undone.</p>
            <input
              type="password"
              value={clearPassphrase}
              onChange={(e) => { setClearPassphrase(e.target.value); setClearError(null) }}
              placeholder="Enter your passphrase"
              autoComplete="current-password"
              className="w-full bg-bg-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red/50 transition-all"
            />
            {clearError && <p className="text-accent-red text-xs">{clearError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                disabled={clearing || !clearPassphrase}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-red hover:bg-accent-red/80 text-white text-sm font-medium disabled:opacity-50 transition-all"
              >
                {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {clearing ? 'Clearing...' : 'Delete Everything'}
              </button>
              <button
                onClick={() => { setShowClearConfirm(false); setClearPassphrase(''); setClearError(null) }}
                className="px-4 py-2 rounded-xl bg-bg-tertiary text-text-muted text-sm hover:bg-bg-hover transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {progress && (
          <div className="mt-4 flex items-center gap-2">
            {done ? <CheckCircle size={16} className="text-accent-green" /> : <Loader2 size={16} className="text-accent-blue animate-spin" />}
            <span className="text-sm text-text-secondary">{progress}</span>
          </div>
        )}
      </div>

      {/* Data Info */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">How Encryption Works</h3>
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p className="font-medium text-text-primary text-xs uppercase tracking-wider mt-1 mb-0.5">Zero-Knowledge Encryption</p>
          <p>• Your passphrase derives an AES-256-GCM key using PBKDF2 with 600,000 iterations — a fresh random salt and IV are generated for every single encryption, so identical data never produces identical ciphertext.</p>
          <p>• Sensitive fields (names, lab values, diagnoses, medications) are encrypted <strong className="text-text-primary">entirely in your browser</strong> before being sent to the database. The server never sees plaintext.</p>
          <p>• Metadata (dates, record types) stays unencrypted for querying — the tradeoff is that <em>what types</em> of records exist is visible, but not their content.</p>

          <p className="font-medium text-text-primary text-xs uppercase tracking-wider mt-3 mb-0.5">Passphrase Protection</p>
          <p>• Your passphrase is cached using a <strong className="text-text-primary">non-extractable Web Crypto wrapping key</strong> stored in IndexedDB — even if malicious code reads sessionStorage, it gets ciphertext that can't be decrypted without the browser-protected key.</p>
          <p>• Passphrase bytes are zeroed from memory immediately after key derivation. The session auto-locks after 15 minutes of inactivity.</p>

          <p className="font-medium text-text-primary text-xs uppercase tracking-wider mt-3 mb-0.5">Recovery & Delivery</p>
          <p>• A recovery code (8 random words) is generated during setup. Your passphrase is encrypted with it and stored — so if you forget your passphrase, the recovery code can restore access without compromising zero-knowledge.</p>
          <p>• All scripts are verified with <strong className="text-text-primary">Subresource Integrity (SRI)</strong> hashes — if the server is compromised and serves modified code, your browser refuses to run it.</p>
          <p>• Content Security Policy blocks inline scripts and unauthorized sources.</p>

          <p className="font-medium text-text-primary text-xs uppercase tracking-wider mt-3 mb-0.5">AI Chat</p>
          <p>• AI chat receives decrypted data only for the API call — never stored server-side. All API endpoints require authentication.</p>
        </div>
      </div>
    </div>
  )
}
