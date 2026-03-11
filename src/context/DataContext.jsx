import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getCachedPassphrase, cachePassphrase, clearCachedPassphrase, createVerificationHash, verifyPassphrase, generateRecoveryCode, createRecoveryBlob, recoverPassphrase } from '../lib/crypto'
import * as db from '../lib/db'

const DataContext = createContext({})

export function DataProvider({ children }) {
  const { user } = useAuth()
  // Use ref for passphrase to minimize string copies from re-renders
  // A state counter triggers dependent effects without exposing the string in state
  const passphraseRef = useRef(null)
  const [unlockVersion, setUnlockVersion] = useState(0)
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
      passphraseRef.current = null
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
                passphraseRef.current = cached
                setIsUnlocked(true)
                setUnlockVersion(v => v + 1)
              }
            })
          }
        })
      }
    })
  }, [user])

  // Load all data when unlocked
  const loadAllData = useCallback(async () => {
    const pp = passphraseRef.current
    if (!user || !pp) return
    setDataLoading(true)
    try {
      let [p, v, l, m, a, g, d] = await Promise.all([
        db.getPatient(user.id, pp),
        db.getVitals(user.id, pp),
        db.getLabResults(user.id, pp),
        db.getMedications(user.id, pp),
        db.getAllergies(user.id, pp),
        db.getGenetics(user.id, pp),
        db.getDocuments(user.id, pp),
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
        await db.upsertPatient(user.id, autoProfile, pp)
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
  }, [user, unlockVersion])

  useEffect(() => {
    if (isUnlocked) loadAllData()
  }, [isUnlocked, loadAllData, unlockVersion])

  // Set up passphrase for first time — returns recovery code (shown once)
  const setupPassphrase = async (newPassphrase) => {
    if (!user) return null
    const hash = await createVerificationHash(newPassphrase)
    // Generate recovery key and encrypt passphrase with it
    const recoveryCode = generateRecoveryCode()
    const recoveryBlob = await createRecoveryBlob(newPassphrase, recoveryCode)
    await db.saveEncryptionSettings(user.id, hash, recoveryBlob)
    passphraseRef.current = newPassphrase
    await cachePassphrase(newPassphrase)
    setHasPassphrase(true)
    setIsUnlocked(true)
    setUnlockVersion(v => v + 1)
    return recoveryCode // caller must display this to the user
  }

  // Unlock with existing passphrase
  const unlock = async (inputPassphrase) => {
    if (!user) return false
    const settings = await db.getEncryptionSettings(user.id)
    if (!settings) return false
    const valid = await verifyPassphrase(inputPassphrase, settings.verification_hash)
    if (valid) {
      passphraseRef.current = inputPassphrase
      await cachePassphrase(inputPassphrase)
      setIsUnlocked(true)
      setUnlockVersion(v => v + 1)
      return true
    }
    return false
  }

  // Recover using recovery code
  const recoverWithCode = async (recoveryCode) => {
    if (!user) return false
    const settings = await db.getEncryptionSettings(user.id)
    if (!settings?.recovery_blob) return false
    const recovered = await recoverPassphrase(recoveryCode, settings.recovery_blob)
    if (!recovered) return false
    // Verify the recovered passphrase actually works
    const valid = await verifyPassphrase(recovered, settings.verification_hash)
    if (valid) {
      passphraseRef.current = recovered
      await cachePassphrase(recovered)
      setIsUnlocked(true)
      setUnlockVersion(v => v + 1)
      return recovered // return passphrase so user can see/save it
    }
    return false
  }

  const lock = useCallback(() => {
    clearCachedPassphrase()
    passphraseRef.current = null // hint to GC
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
      passphrase: passphraseRef.current, isUnlocked, hasPassphrase,
      setupPassphrase, unlock, recoverWithCode, lock,
      patient, vitals, labResults, medications, allergies, genetics, documents,
      dataLoading, loadAllData,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
