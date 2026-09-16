import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { FinanceApiError } from "./server";

function encryptionKey() {
  const value = process.env.FINANCE_CREDENTIALS_ENCRYPTION_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(value))
    throw new FinanceApiError(
      "Secure key storage needs FINANCE_CREDENTIALS_ENCRYPTION_KEY configured on the server.",
      503,
    );
  return Buffer.from(value, "hex");
}

export function canSaveCredentials() {
  return /^[a-fA-F0-9]{64}$/.test(
    process.env.FINANCE_CREDENTIALS_ENCRYPTION_KEY ?? "",
  );
}

export function encryptCredential(
  value: string,
  familyId: string,
  userId: string,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(JSON.stringify([familyId, userId])));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
}

export function decryptCredential(
  value: string,
  familyId: string,
  userId: string,
) {
  const key = encryptionKey();
  try {
    const [version, iv, tag, encrypted, extra] = value.split(".");
    if (
      version !== "v1" ||
      extra ||
      !/^[a-f0-9]{24}$/.test(iv ?? "") ||
      !/^[a-f0-9]{32}$/.test(tag ?? "") ||
      !/^(?:[a-f0-9]{2})+$/.test(encrypted ?? "")
    )
      throw new Error("Invalid envelope");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex"),
    );
    decipher.setAAD(Buffer.from(JSON.stringify([familyId, userId])));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new FinanceApiError(
      "The saved key could not be opened. Replace it using Save connection.",
      503,
    );
  }
}
