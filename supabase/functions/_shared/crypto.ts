import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

if (!ENCRYPTION_KEY) {
  console.error("CRITICAL: ENCRYPTION_KEY is missing. Decryption will fail.");
}

export function decryptMessage(cipherText: string): string {
  if (!cipherText) return '';
  if (!ENCRYPTION_KEY) return cipherText;

  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!originalText) {
      // This can happen if the key is wrong.
      throw new Error("Decryption resulted in empty string. Check key.");
    }
    
    return originalText;
  } catch (error) {
    console.error("Decryption Failed:", error); 
    throw new Error("Failed to decrypt secret.");
  }
}