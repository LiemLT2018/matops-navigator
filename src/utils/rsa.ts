/**
 * RSA-OAEP helpers using Web Crypto API
 */

/** Strip PEM header/footer and decode Base64 to ArrayBuffer */
export function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(lines);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Convert ArrayBuffer to Base64 string (no line breaks) */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Encrypt password with RSA-OAEP SHA-256, returns Base64 ciphertext */
export async function encryptPasswordRSA(
  publicKeyPem: string,
  password: string,
): Promise<string> {
  const spkiBuffer = pemToArrayBuffer(publicKeyPem);

  const publicKey = await crypto.subtle.importKey(
    'spki',
    spkiBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );

  const plainBytes = new TextEncoder().encode(password);
  const cipherBytes = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    plainBytes,
  );

  return arrayBufferToBase64(cipherBytes);
}
