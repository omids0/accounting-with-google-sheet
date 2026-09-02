const PBKDF2_ITERATIONS = 100_000

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  let binary = ''

  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])

  return btoa(binary)
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)

  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return bytes.buffer
}

export function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

export async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, [
    'deriveBits'
  ])

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )

  return bufferToBase64(bits)
}
