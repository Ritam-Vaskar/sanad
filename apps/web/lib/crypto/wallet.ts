import type { WalletVault } from '@/types'

const encoder = new TextEncoder()
let signingKey: CryptoKey | null = null

export function lockWalletSession() {
  signingKey = null
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function assertWebCrypto() {
  if (!globalThis.crypto?.subtle) throw new Error('Secure wallet signing is unavailable in this browser.')
}

export async function createWalletVault(passphrase: string): Promise<WalletVault> {
  assertWebCrypto()
  if (passphrase.trim().length < 6) throw new Error('Use a passphrase with at least 6 characters.')
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptionKey = await deriveEncryptionKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, encoder.encode(JSON.stringify(privateJwk)))
  signingKey = pair.privateKey
  return {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey),
  }
}

export async function unlockWalletVault(passphrase: string, vault: WalletVault) {
  assertWebCrypto()
  try {
    const encryptionKey = await deriveEncryptionKey(passphrase, base64ToBytes(vault.salt))
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(vault.iv) },
      encryptionKey,
      base64ToBytes(vault.ciphertext),
    )
    const privateJwk = JSON.parse(new TextDecoder().decode(plaintext)) as JsonWebKey
    signingKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  } catch {
    signingKey = null
    throw new Error('Incorrect passphrase or damaged wallet backup.')
  }
}

export async function signWalletMessage(message: string) {
  assertWebCrypto()
  if (!signingKey) throw new Error('Unlock your wallet before signing.')
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, encoder.encode(message))
  return bytesToBase64(new Uint8Array(signature))
}

export async function verifyWalletMessage(message: string, signature: string, publicKey: JsonWebKey) {
  assertWebCrypto()
  try {
    const key = await crypto.subtle.importKey('jwk', publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64ToBytes(signature),
      encoder.encode(message),
    )
  } catch {
    return false
  }
}

export function mandateSigningMessage(input: {
  borrowerId: string
  purpose: string
  maxAmount: number
  maxEmi: number
  allowedLenders: string[]
  disclosures: Record<string, boolean>
  allowAccept: boolean
  expiresAt: string
}) {
  return JSON.stringify({
    borrowerId: input.borrowerId,
    purpose: input.purpose,
    maxAmount: input.maxAmount,
    maxEmi: input.maxEmi,
    allowedLenders: [...input.allowedLenders].sort(),
    disclosures: Object.fromEntries(Object.entries(input.disclosures).sort(([first], [second]) => first.localeCompare(second))),
    allowAccept: input.allowAccept,
    expiresAt: input.expiresAt,
  })
}

export function offerAcceptanceMessage(runId: string, offer: { id: string; lenderId: string; principal: number; rate: number; tenure: number; totalCost: number }) {
  return JSON.stringify({ runId, offerId: offer.id, lenderId: offer.lenderId, principal: offer.principal, rate: offer.rate, tenure: offer.tenure, totalCost: offer.totalCost })
}
