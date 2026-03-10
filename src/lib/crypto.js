// Client-side encryption using Web Crypto API
// AES-256-GCM with PBKDF2 key derivation

// Safe JSON parse — returns null on failure instead of throwing
export function safeJsonParse(str) {
  if (!str || typeof str !== 'string') return str
  if (str === '[Decryption failed]') return null
  try { return JSON.parse(str) } catch { return str }
}

const SALT_LENGTH = 16
const IV_LENGTH = 12
const PBKDF2_ITERATIONS = 600000

// Convert string to ArrayBuffer
function str2ab(str) {
  return new TextEncoder().encode(str)
}

// Convert ArrayBuffer to base64
function ab2b64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert base64 to ArrayBuffer
function b642ab(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Derive AES-256-GCM key from passphrase using PBKDF2
async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt a string value. Returns base64 string: salt|iv|ciphertext
export async function encrypt(plaintext, passphrase) {
  if (!plaintext || !passphrase) return plaintext
  
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(passphrase, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    str2ab(plaintext)
  )

  // Combine salt + iv + ciphertext into one base64 string
  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)

  return 'enc:' + ab2b64(combined.buffer)
}

// Decrypt a string. Input is "enc:" prefixed base64.
export async function decrypt(encryptedStr, passphrase) {
  if (!encryptedStr || !passphrase) return encryptedStr
  if (!encryptedStr.startsWith('enc:')) return encryptedStr // not encrypted

  const combined = new Uint8Array(b642ab(encryptedStr.slice(4)))
  const salt = combined.slice(0, SALT_LENGTH)
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(passphrase, salt)

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(plainBuffer)
}

// Encrypt an object's sensitive fields
export async function encryptFields(obj, fields, passphrase) {
  if (!passphrase) return obj
  const result = { ...obj }
  for (const field of fields) {
    if (result[field] != null) {
      const val = typeof result[field] === 'string' ? result[field] : JSON.stringify(result[field])
      result[field] = await encrypt(val, passphrase)
    }
  }
  return result
}

// Decrypt an object's sensitive fields
export async function decryptFields(obj, fields, passphrase) {
  if (!passphrase) return obj
  const result = { ...obj }
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string' && result[field].startsWith('enc:')) {
      try {
        const decrypted = await decrypt(result[field], passphrase)
        // Try parsing JSON
        try {
          result[field] = JSON.parse(decrypted)
        } catch {
          result[field] = decrypted
        }
      } catch {
        result[field] = '[Decryption failed]'
      }
    }
  }
  return result
}

// Create a verification hash so we can check if passphrase is correct
export async function createVerificationHash(passphrase) {
  const testData = 'meddash-verify-v1'
  return encrypt(testData, passphrase)
}

// Verify passphrase against stored hash
export async function verifyPassphrase(passphrase, storedHash) {
  try {
    const result = await decrypt(storedHash, passphrase)
    return result === 'meddash-verify-v1'
  } catch {
    return false
  }
}

// Cache key management using sessionStorage
const SESSION_KEY = 'meddash_passphrase'

export function getCachedPassphrase() {
  return sessionStorage.getItem(SESSION_KEY)
}

export function cachePassphrase(passphrase) {
  sessionStorage.setItem(SESSION_KEY, passphrase)
}

export function clearCachedPassphrase() {
  sessionStorage.removeItem(SESSION_KEY)
}
