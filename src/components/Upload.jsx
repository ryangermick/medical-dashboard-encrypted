import { useState, useCallback, useRef } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { authFetch } from '../lib/api'
import { Upload as UploadIcon, FileText, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react'
import * as db from '../lib/db'

export default function Upload() {
  const { passphrase, loadAllData } = useData()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState([])
  const processingRef = useRef(false)

  const handleFiles = useCallback(async (fileList) => {
    const newFiles = Array.from(fileList).filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    )
    if (!newFiles.length) return
    setFiles(newFiles)
    setProcessing(true)
    processingRef.current = true
    setResults([])

    for (const file of newFiles) {
      try {
        // Convert to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Send to parse API (authenticated)
        const res = await authFetch('/api/parse-record', {
          method: 'POST',
          body: JSON.stringify({
            file: base64,
            filename: file.name,
            mimeType: file.type,
          }),
        })
        const data = await res.json()

        if (data.error) {
          setResults(r => [...r, { file: file.name, status: 'error', message: data.error }])
          continue
        }

        // Save parsed data to DB (encrypted) — each save independent
        const parsed = data.parsed
        const saved = []
        const errors = []

        const trySave = async (label, fn) => {
          try { await fn(); saved.push(label) } catch (e) { console.error(`Save ${label} failed:`, e); errors.push(label) }
        }

        if (parsed.vitals?.length) {
          await trySave(`${parsed.vitals.length} vitals`, () => db.insertVitals(user.id, parsed.vitals, passphrase))
        }
        if (parsed.labResults?.length) {
          await trySave(`${parsed.labResults.length} lab panels`, () => db.insertLabResults(user.id, parsed.labResults, passphrase))
        }
        if (parsed.medications?.length) {
          await trySave(`${parsed.medications.length} medications`, () => db.insertMedications(user.id, parsed.medications, passphrase))
        }
        if (parsed.allergies?.length) {
          await trySave(`${parsed.allergies.length} allergies`, () => db.insertAllergies(user.id, parsed.allergies, passphrase))
        }
        if (parsed.genetics) {
          await trySave('genetics data', () => db.upsertGenetics(user.id, { data: JSON.stringify(parsed.genetics) }, passphrase))
        }

        // Save document record (truncate parsed_data if huge)
        const docData = JSON.stringify(parsed)
        await trySave('document record', () => db.insertDocument(user.id, {
          filename: file.name,
          file_type: file.type,
          parsed_data: docData.length > 50000 ? docData.substring(0, 50000) : docData,
          status: 'processed',
        }, passphrase))

        const msg = saved.length ? `Saved: ${saved.join(', ')}` : 'Parsed but nothing to save'
        const errMsg = errors.length ? ` | Failed: ${errors.join(', ')}` : ''
        setResults(r => [...r, {
          file: file.name,
          status: errors.length ? 'error' : 'success',
          message: msg + errMsg,
        }])
      } catch (err) {
        setResults(r => [...r, { file: file.name, status: 'error', message: err.message }])
      }
    }

    setProcessing(false)
    processingRef.current = false
    await loadAllData()
    addToast(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} processed — records updated`, 'success')
  }, [user, passphrase, loadAllData, addToast])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Upload Records</h1>
        <p className="text-sm text-text-muted mt-1">Upload medical PDFs or images — AI will extract and encrypt your data</p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`glass rounded-2xl p-12 text-center border-2 border-dashed transition-all cursor-pointer ${
          dragging ? 'border-accent-blue bg-accent-blue/5' : 'border-border-primary hover:border-border-hover'
        }`}
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.multiple = true
          input.accept = '.pdf,image/*'
          input.onchange = (e) => handleFiles(e.target.files)
          input.click()
        }}
      >
        <UploadIcon size={40} strokeWidth={1.5} className={`mx-auto mb-4 ${dragging ? 'text-accent-blue' : 'text-text-muted'}`} />
        <h3 className="text-lg font-medium text-text-primary mb-2">
          {dragging ? 'Drop files here' : 'Drag & drop medical records'}
        </h3>
        <p className="text-sm text-text-muted">PDF or image files • AI extracts vitals, labs, medications</p>
        <p className="text-xs text-text-muted mt-2">All data is encrypted before saving</p>
      </div>

      {/* Processing */}
      {processing && (
        <div className="glass rounded-2xl p-5 flex items-center gap-3">
          <Loader2 size={18} className="text-accent-blue animate-spin" />
          <span className="text-sm text-text-primary">Processing files with Gemini AI...</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">Results</h3>
          {results.map((r, i) => (
            <div key={i} className={`glass rounded-2xl p-4 flex items-start gap-3 ${r.status === 'error' ? 'border-accent-red/20' : 'border-accent-green/20'}`}>
              {r.status === 'success' ? (
                <CheckCircle size={18} strokeWidth={1.5} className="text-accent-green shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} strokeWidth={1.5} className="text-accent-red shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">{r.file}</p>
                <p className="text-xs text-text-muted mt-1">{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-2">
              <UploadIcon size={18} className="text-accent-blue" />
            </div>
            <p className="text-sm text-text-primary font-medium">1. Upload</p>
            <p className="text-xs text-text-muted mt-1">Drop PDF or image files</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center mx-auto mb-2">
              <FileText size={18} className="text-accent-purple" />
            </div>
            <p className="text-sm text-text-primary font-medium">2. AI Parse</p>
            <p className="text-xs text-text-muted mt-1">Gemini extracts structured data</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle size={18} className="text-accent-green" />
            </div>
            <p className="text-sm text-text-primary font-medium">3. Encrypt & Save</p>
            <p className="text-xs text-text-muted mt-1">Data encrypted in your browser</p>
          </div>
        </div>
      </div>
    </div>
  )
}
