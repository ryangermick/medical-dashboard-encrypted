import { safeJsonParse } from '../lib/crypto'
import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import * as db from '../lib/db'
import { Save, X, Pencil, User, Heart } from 'lucide-react'

const Field = ({ label, value, editing, onChange, type = 'text', options }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-text-muted uppercase tracking-wider">{label}</label>
    {editing ? (
      options ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50 transition-all">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50 transition-all" />
      )
    ) : (
      <p className="text-sm text-text-primary font-medium">{value || '—'}</p>
    )}
  </div>
)

export default function Profile() {
  const { patient, passphrase, loadAllData } = useData()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(null)

  if (!patient) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Profile</h1>
        <p className="text-text-muted">No profile data yet. Load demo data or upload records.</p>
      </div>
    )
  }

  const startEdit = () => {
    setDraft({ ...patient })
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(null)
  }

  const save = async () => {
    setSaving(true)
    try {
      await db.upsertPatient(user.id, draft, passphrase)
      await loadAllData()
      setEditing(false)
      setDraft(null)
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const update = (key, val) => setDraft(d => ({ ...d, [key]: val }))
  const data = editing ? draft : patient

  const emergency = typeof patient.emergency_contact === 'string'
    ? safeJsonParse(patient.emergency_contact)
    : patient.emergency_contact

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Profile</h1>
          <p className="text-sm text-text-muted mt-1">Manage personal information</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <button onClick={cancel} className="p-2 rounded-lg hover:bg-bg-hover"><X size={14} className="text-text-muted" /></button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/10 text-accent-green text-xs font-medium hover:bg-accent-green/20">
              <Save size={12} />{saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-bg-hover text-text-muted text-xs">
            <Pencil size={12} />Edit
          </button>
        )}
      </div>

      {/* Header Card */}
      <div className="glass rounded-2xl p-6 flex items-center gap-6">
        <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-bg-tertiary flex items-center justify-center">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-text-muted text-2xl font-semibold">{(data.name || '').split(' ').map(n => n[0]).join('')}</span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{data.name}</h2>
          <p className="text-sm text-text-muted">{data.age}yo {data.sex} • {data.blood_type} • BMI {data.bmi}</p>
          <p className="text-xs text-text-muted mt-1">{data.member_id} • {data.insurance}</p>
        </div>
      </div>

      {/* Personal Info */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xs text-text-muted uppercase tracking-wider flex items-center gap-2 mb-5">
          <User size={14} strokeWidth={1.5} className="text-accent-blue" /> Personal Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={data.name} editing={editing} onChange={v => update('name', v)} />
          <Field label="Date of Birth" value={data.dob} editing={editing} onChange={v => update('dob', v)} type="date" />
          <Field label="Sex" value={data.sex} editing={editing} onChange={v => update('sex', v)} options={['Male', 'Female', 'Other']} />
          <Field label="Age" value={String(data.age)} editing={editing} onChange={v => update('age', v)} />
          <Field label="Height" value={data.height} editing={editing} onChange={v => update('height', v)} />
          <Field label="Weight" value={data.weight} editing={editing} onChange={v => update('weight', v)} />
          <Field label="Blood Type" value={data.blood_type} editing={editing} onChange={v => update('blood_type', v)} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
          <Field label="Member ID" value={data.member_id} editing={editing} onChange={v => update('member_id', v)} />
          <Field label="Primary Physician" value={data.primary_physician} editing={editing} onChange={v => update('primary_physician', v)} />
          <Field label="Insurance" value={data.insurance} editing={editing} onChange={v => update('insurance', v)} />
        </div>
      </div>

      {/* Emergency Contact */}
      {emergency && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-xs text-text-muted uppercase tracking-wider flex items-center gap-2 mb-5">
            <Heart size={14} strokeWidth={1.5} className="text-accent-red" /> Emergency Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Name" value={emergency.name} editing={false} />
            <Field label="Relationship" value={emergency.relationship} editing={false} />
            <Field label="Phone" value={emergency.phone} editing={false} />
          </div>
        </div>
      )}
    </div>
  )
}
