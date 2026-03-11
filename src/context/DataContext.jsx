import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getCachedPassphrase, cachePassphrase, clearCachedPassphrase, createVerificationHash, verifyPassphrase } from '../lib/crypto'
import * as db from '../lib/db'

const DataContext = createContext({})

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [passphrase, setPassphrase] = useState(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [hasPassphrase, setHasPassphrase] = useState(null) // null = loading
  const [patient, setPatient] = useState(null)
  const [vitals, setVitals] = useState([])
  const [labResults, setLabResults] = useState([])
  const [medications, setMedications] = useState([])
  const [allergies, setAllergies] = useState([])
  const [genetics, setGenetics] = useState(null)
  const [documents, setDocuments] = useState([])
  const [dataLoading, setDataLoading] = useState(false)

  // Check if user has encryption set up
  useEffect(() => {
    if (!user) {
      setHasPassphrase(null)
      setIsUnlocked(false)
      setPassphrase(null)
      return
    }
    db.getEncryptionSettings(user.id).then(settings => {
      setHasPassphrase(!!settings)
      // Check for cached passphrase (async — uses Web Crypto wrapping key)
      if (settings) {
        getCachedPassphrase().then(cached => {
          if (cached) {
            verifyPassphrase(cached, settings.verification_hash).then(valid => {
              if (valid) {
                setPassphrase(cached)
                setIsUnlocked(true)
              }
            })
          }
        })
      }
    })
  }, [user])

  // Load all data when unlocked
  const loadAllData = useCallback(async () => {
    if (!user || !passphrase) return
    setDataLoading(true)
    try {
      let [p, v, l, m, a, g, d] = await Promise.all([
        db.getPatient(user.id, passphrase),
        db.getVitals(user.id, passphrase),
        db.getLabResults(user.id, passphrase),
        db.getMedications(user.id, passphrase),
        db.getAllergies(user.id, passphrase),
        db.getGenetics(user.id, passphrase),
        db.getDocuments(user.id, passphrase),
      ])
      // Auto-create patient profile from Google account if none exists
      if (!p && user) {
        const meta = user.user_metadata || {}
        const autoProfile = {
          name: meta.full_name || meta.name || user.email?.split('@')[0] || '',
          age: null, sex: '', dob: '', height: '', weight: '',
          blood_type: '', member_id: '', primary_physician: '',
          insurance: '', bmi: null, emergency_contact: '',
        }
        await db.upsertPatient(user.id, autoProfile, passphrase)
        p = autoProfile
      }
      setPatient(p)
      setVitals(v)
      setLabResults(l)
      setMedications(m)
      setAllergies(a)
      setGenetics(g)
      setDocuments(d)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setDataLoading(false)
    }
  }, [user, passphrase])

  useEffect(() => {
    if (isUnlocked) loadAllData()
  }, [isUnlocked, loadAllData])

  // Set up passphrase for first time
  const setupPassphrase = async (newPassphrase) => {
    if (!user) return
    const hash = await createVerificationHash(newPassphrase)
    await db.saveEncryptionSettings(user.id, hash)
    setPassphrase(newPassphrase)
    await cachePassphrase(newPassphrase)
    setHasPassphrase(true)
    setIsUnlocked(true)
  }

  // Unlock with existing passphrase
  const unlock = async (inputPassphrase) => {
    if (!user) return false
    const settings = await db.getEncryptionSettings(user.id)
    if (!settings) return false
    const valid = await verifyPassphrase(inputPassphrase, settings.verification_hash)
    if (valid) {
      setPassphrase(inputPassphrase)
      await cachePassphrase(inputPassphrase)
      setIsUnlocked(true)
      return true
    }
    return false
  }

  const lock = useCallback(() => {
    clearCachedPassphrase()
    setPassphrase(null)
    setIsUnlocked(false)
    setPatient(null)
    setVitals([])
    setLabResults([])
    setMedications([])
    setAllergies([])
    setGenetics(null)
    setDocuments([])
  }, [])

  // Auto-lock after 15 minutes of inactivity
  const AUTO_LOCK_MS = 15 * 60 * 1000
  const lockTimerRef = useRef(null)

  useEffect(() => {
    if (!isUnlocked) return

    const resetTimer = () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      lockTimerRef.current = setTimeout(() => {
        console.log('Auto-locking due to inactivity')
        lock()
      }, AUTO_LOCK_MS)
    }

    // Reset on user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    }
  }, [isUnlocked, lock])

  return (
    <DataContext.Provider value={{
      passphrase, isUnlocked, hasPassphrase,
      setupPassphrase, unlock, lock,
      patient, vitals, labResults, medications, allergies, genetics, documents,
      dataLoading, loadAllData,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
