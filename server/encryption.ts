import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    return null;
  }
  cachedKey = crypto.scryptSync(key, "email-encryption-salt", 32);
  return cachedKey;
}

export function validateEncryptionKey(): boolean {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    console.warn("WARNING: EMAIL_ENCRYPTION_KEY not set - email content will NOT be encrypted at rest!");
    return false;
  }
  if (key.length < 32) {
    console.warn("WARNING: EMAIL_ENCRYPTION_KEY should be at least 32 characters for security");
  }
  console.log("Email encryption enabled with AES-256-GCM");
  return true;
}

export function encryptEmailContent(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  
  try {
    const key = getEncryptionKey();
    if (!key) {
      return plaintext;
    }
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    const authTag = cipher.getAuthTag();
    
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, "base64")
    ]);
    
    return "ENC:" + combined.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    return plaintext;
  }
}

export function decryptEmailContent(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  
  if (!ciphertext.startsWith("ENC:")) {
    return ciphertext;
  }
  
  try {
    const key = getEncryptionKey();
    if (!key) {
      console.warn("Cannot decrypt: EMAIL_ENCRYPTION_KEY not set");
      return "[Encrypted content - key not available]";
    }
    
    const combined = Buffer.from(ciphertext.slice(4), "base64");
    
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption error:", error);
    return ciphertext;
  }
}

export function isEncrypted(content: string | null | undefined): boolean {
  return content?.startsWith("ENC:") ?? false;
}
