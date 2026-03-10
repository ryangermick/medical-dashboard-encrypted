import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { loadDemoData } from '../lib/demoData'
import { Database, Loader2, CheckCircle, Trash2, Shield } from 'lucide-react'
import * as db from '../lib/db'

export default function Settings() {
  const { passphrase, loadAllData, patient } = useData()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [done, setDone] = useState(false)
  const [clearing, setClearing] = useState(false)

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
    if (!confirm('This will delete ALL your medical data. Are you sure?')) return
    setClearing(true)
    try {
      await db.clearAllUserData(user.id)
      await loadAllData()
      setProgress('All data cleared.')
      setDone(false)
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
            <p className="text-xs text-text-muted">Session Key</p>
            <p className="text-sm text-accent-green font-medium">Cached (tab only)</p>
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

          {patient && (
            <button
              onClick={handleClear}
              disabled={loading || clearing}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-accent-red/30 text-accent-red hover:bg-accent-red/10 font-medium text-sm disabled:opacity-50 transition-all"
            >
              {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {clearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          )}
        </div>

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
          <p>• Your passphrase derives an AES-256-GCM encryption key using PBKDF2 with 600,000 iterations.</p>
          <p>• Sensitive fields (names, lab values, diagnoses, medications) are encrypted <strong className="text-text-primary">in your browser</strong> before being sent to the database.</p>
          <p>• The database only stores ciphertext — a breach reveals nothing useful.</p>
          <p>• Metadata (dates, record types) stays unencrypted for querying.</p>
          <p>• Your derived key is cached in sessionStorage — it's cleared when you close the tab.</p>
          <p>• AI chat receives decrypted data only for the API call — never stored server-side.</p>
        </div>
      </div>
    </div>
  )
}
