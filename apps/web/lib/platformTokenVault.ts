import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_BYTES = 32;

function getKey() {
  const raw = process.env.PLATFORM_TOKEN_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new Error("PLATFORM_TOKEN_ENCRYPTION_KEY is required to store platform tokens.");
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const decoded = Buffer.from(raw, "base64");

  if (decoded.length === KEY_BYTES) {
    return decoded;
  }

  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptPlatformToken(token: string) {
  if (!token) return "";

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptPlatformToken(encryptedToken: string) {
  if (!encryptedToken) return "";

  const [ivRaw, tagRaw, encryptedRaw] = encryptedToken.split(".");

  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Stored platform token is invalid.");
  }

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function assertPlatformTokenEncryptionConfigured() {
  getKey();
}
