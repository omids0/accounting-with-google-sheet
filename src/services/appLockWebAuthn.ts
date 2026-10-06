import { base64ToBuffer, bufferToBase64 } from './appLockCrypto'
import { getUserEmail, getUserName } from './auth'

/** Minimal typing for the WebAuthn PRF extension (not in every TS DOM lib yet). */
interface PrfExtensionOutput {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } }
}

export interface WebAuthnResult {
  credentialId: string
  /** 32 bytes from the authenticator's PRF, when it supports the extension. */
  prfOutput: ArrayBuffer | null
  /** The authenticator agreed to PRF, even if it gave no output during creation. */
  prfEnabled: boolean
}

function prfInputs(prfSalt?: Uint8Array): AuthenticationExtensionsClientInputs | undefined {
  if (!prfSalt) return undefined

  return {
    prf: { eval: { first: new Uint8Array(prfSalt) } }
  } as AuthenticationExtensionsClientInputs
}

function readPrf(credential: PublicKeyCredential): PrfExtensionOutput['prf'] {
  try {
    return (credential.getClientExtensionResults() as PrfExtensionOutput).prf
  } catch {
    return undefined
  }
}

/** Registers a platform credential, asking for PRF output with `prfSalt` when given. */
export async function registerWebAuthnCredential(prfSalt?: Uint8Array): Promise<WebAuthnResult> {
  const email = getUserEmail()

  if (!email) throw new Error('ابتدا وارد حساب شوید')

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'حسابداری شخصی', id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: email,
        displayName: getUserName() || email
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required'
      },
      timeout: 60_000,
      attestation: 'none',
      extensions: prfInputs(prfSalt)
    }
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('ثبت اثر انگشت لغو شد')

  const prf = readPrf(credential)

  return {
    credentialId: bufferToBase64(credential.rawId),
    prfOutput: prf?.results?.first ?? null,
    prfEnabled: !!(prf?.enabled || prf?.results?.first)
  }
}

/** Asks for the user's fingerprint; returns null when it is refused or cancelled. */
export async function getWebAuthnAssertion(
  credentialId: string,
  prfSalt?: Uint8Array
): Promise<WebAuthnResult | null> {
  try {
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: [{ id: base64ToBuffer(credentialId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60_000,
        extensions: prfInputs(prfSalt)
      }
    })) as PublicKeyCredential | null

    if (!credential) return null

    const prf = readPrf(credential)

    return {
      credentialId,
      prfOutput: prf?.results?.first ?? null,
      prfEnabled: !!prf?.results?.first
    }
  } catch {
    return null
  }
}
