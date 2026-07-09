import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm" as const;
const ENC_PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const keyHex = process.env.BROKER_ENCRYPTION_KEY;
  if (!keyHex) return null;
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("BROKER_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)");
  }
  return key;
}

export function encryptCredential(plaintext: string): string {
  const key = getKey();
  if (!key) {
    // Key not configured — warn once per process restart
    if (typeof process !== "undefined" && !(process as NodeJS.Process & { _brokerCryptoWarned?: boolean })._brokerCryptoWarned) {
      (process as NodeJS.Process & { _brokerCryptoWarned?: boolean })._brokerCryptoWarned = true;
      console.warn("[broker-crypto] BROKER_ENCRYPTION_KEY not set — storing credentials unencrypted");
    }
    return plaintext;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptCredential(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) {
    // Legacy plaintext value — return as-is for backward compat
    return value;
  }

  const key = getKey();
  if (!key) {
    throw new Error("Cannot decrypt broker credentials: BROKER_ENCRYPTION_KEY is not set");
  }

  const inner = value.slice(ENC_PREFIX.length);
  const parts = inner.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted credential format");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
