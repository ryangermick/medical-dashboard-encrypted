// Database operations with encryption layer
import { supabase } from './supabase'
import { encryptFields, decryptFields } from './crypto'

// Field definitions: which fields to encrypt per table
const ENCRYPTED_FIELDS = {
  patients: ['name', 'dob', 'sex', 'height', 'weight', 'blood_type', 'primary_physician', 'insurance', 'emergency_contact', 'member_id'],
  chat_messages: ['content'],
  vitals: ['value', 'notes'],
  lab_results: ['panel_name', 'results'],  // results is JSON
  medications: ['name', 'dose', 'purpose', 'frequency'],
  allergies: ['allergen', 'reaction', 'severity'],
  genetics: ['data'],  // single JSON blob
  documents: ['parsed_data', 'filename'],
}

// ---- Patient ----
export async function getPatient(userId, passphrase) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return decryptFields(data, ENCRYPTED_FIELDS.patients, passphrase)
}

export async function upsertPatient(userId, patient, passphrase) {
  // Sanitize integer fields before DB insert
  const sanitized = { ...patient }
  sanitized.age = sanitized.age ? Number(sanitized.age) || null : null
  sanitized.bmi = sanitized.bmi ? Number(sanitized.bmi) || null : null

  const encrypted = await encryptFields(
    { ...sanitized, user_id: userId },
    ENCRYPTED_FIELDS.patients,
    passphrase
  )
  const { data, error } = await supabase
    .from('patients')
    .upsert(encrypted, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ---- Vitals ----
export async function getVitals(userId, passphrase) {
  const { data, error } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
  if (error) throw error
  return Promise.all((data || []).map(v => decryptFields(v, ENCRYPTED_FIELDS.vitals, passphrase)))
}

export async function insertVital(userId, vital, passphrase) {
  const encrypted = await encryptFields(
    { ...vital, user_id: userId },
    ENCRYPTED_FIELDS.vitals,
    passphrase
  )
  const { data, error } = await supabase.from('vitals').insert(encrypted).select().single()
  if (error) throw error
  return data
}

export async function insertVitals(userId, vitals, passphrase) {
  const encrypted = await Promise.all(
    vitals.map(v => encryptFields({ ...v, user_id: userId }, ENCRYPTED_FIELDS.vitals, passphrase))
  )
  const { data, error } = await supabase.from('vitals').insert(encrypted).select()
  if (error) throw error
  return data
}

// ---- Lab Results ----
export async function getLabResults(userId, passphrase) {
  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('user_id', userId)
    .order('drawn_date', { ascending: false })
  if (error) throw error
  return Promise.all((data || []).map(l => decryptFields(l, ENCRYPTED_FIELDS.lab_results, passphrase)))
}

export async function insertLabResult(userId, lab, passphrase) {
  const encrypted = await encryptFields(
    { ...lab, user_id: userId },
    ENCRYPTED_FIELDS.lab_results,
    passphrase
  )
  const { data, error } = await supabase.from('lab_results').insert(encrypted).select().single()
  if (error) throw error
  return data
}

export async function insertLabResults(userId, labs, passphrase) {
  const encrypted = await Promise.all(
    labs.map(l => encryptFields({ ...l, user_id: userId }, ENCRYPTED_FIELDS.lab_results, passphrase))
  )
  const { data, error } = await supabase.from('lab_results').insert(encrypted).select()
  if (error) throw error
  return data
}

// ---- Medications ----
export async function getMedications(userId, passphrase) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return Promise.all((data || []).map(m => decryptFields(m, ENCRYPTED_FIELDS.medications, passphrase)))
}

export async function insertMedications(userId, meds, passphrase) {
  const encrypted = await Promise.all(
    meds.map(m => encryptFields({ ...m, user_id: userId }, ENCRYPTED_FIELDS.medications, passphrase))
  )
  const { data, error } = await supabase.from('medications').insert(encrypted).select()
  if (error) throw error
  return data
}

// ---- Allergies ----
export async function getAllergies(userId, passphrase) {
  const { data, error } = await supabase
    .from('allergies')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return Promise.all((data || []).map(a => decryptFields(a, ENCRYPTED_FIELDS.allergies, passphrase)))
}

export async function insertAllergies(userId, allergies, passphrase) {
  const encrypted = await Promise.all(
    allergies.map(a => encryptFields({ ...a, user_id: userId }, ENCRYPTED_FIELDS.allergies, passphrase))
  )
  const { data, error } = await supabase.from('allergies').insert(encrypted).select()
  if (error) throw error
  return data
}

// ---- Genetics ----
export async function getGenetics(userId, passphrase) {
  const { data, error } = await supabase
    .from('genetics')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return decryptFields(data, ENCRYPTED_FIELDS.genetics, passphrase)
}

export async function upsertGenetics(userId, genetics, passphrase) {
  const encrypted = await encryptFields(
    { ...genetics, user_id: userId },
    ENCRYPTED_FIELDS.genetics,
    passphrase
  )
  const { data, error } = await supabase
    .from('genetics')
    .upsert(encrypted, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ---- Documents ----
export async function getDocuments(userId, passphrase) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return Promise.all((data || []).map(d => decryptFields(d, ENCRYPTED_FIELDS.documents, passphrase)))
}

export async function insertDocument(userId, doc, passphrase) {
  const encrypted = await encryptFields(
    { ...doc, user_id: userId },
    ENCRYPTED_FIELDS.documents,
    passphrase
  )
  const { data, error } = await supabase.from('documents').insert(encrypted).select().single()
  if (error) throw error
  return data
}

// ---- Encryption settings ----
export async function getEncryptionSettings(userId) {
  const { data, error } = await supabase
    .from('encryption_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveEncryptionSettings(userId, verificationHash) {
  const { data, error } = await supabase
    .from('encryption_settings')
    .upsert({
      user_id: userId,
      verification_hash: verificationHash,
    }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ---- Bulk delete for demo data reset ----
export async function clearAllUserData(userId) {
  await supabase.from('vitals').delete().eq('user_id', userId)
  await supabase.from('lab_results').delete().eq('user_id', userId)
  await supabase.from('medications').delete().eq('user_id', userId)
  await supabase.from('allergies').delete().eq('user_id', userId)
  await supabase.from('genetics').delete().eq('user_id', userId)
  await supabase.from('documents').delete().eq('user_id', userId)
  await supabase.from('chat_messages').delete().eq('user_id', userId)
  await supabase.from('chat_sessions').delete().eq('user_id', userId)
  await supabase.from('patients').delete().eq('user_id', userId)
}

// ---- Chat Sessions ----
export async function getChatSessions(userId) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createChatSession(userId, title) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, title: title || 'New Chat' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateChatSessionTitle(sessionId, title) {
  await supabase.from('chat_sessions').update({ title, updated_at: new Date().toISOString() }).eq('id', sessionId)
}

export async function deleteChatSession(sessionId) {
  await supabase.from('chat_messages').delete().eq('session_id', sessionId)
  await supabase.from('chat_sessions').delete().eq('id', sessionId)
}

export async function getChatMessages(sessionId, userId, passphrase) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  if (!data) return []
  return Promise.all(data.map(m => decryptFields(m, ENCRYPTED_FIELDS.chat_messages, passphrase)))
}

export async function saveChatMessage(sessionId, userId, role, content, passphrase) {
  const encrypted = await encryptFields(
    { session_id: sessionId, user_id: userId, role, content },
    ENCRYPTED_FIELDS.chat_messages,
    passphrase
  )
  const { error } = await supabase.from('chat_messages').insert(encrypted)
  if (error) throw error
  // Update session timestamp
  await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId)
}
