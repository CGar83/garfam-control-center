// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  encryptCredential,
  decryptCredential,
  canSaveCredentials,
} from "@/lib/finance/credential-crypto";
import {
  conversationContext,
  savedMessagesSchema,
} from "@/lib/finance/conversation";

beforeEach(() => {
  vi.stubEnv("FINANCE_CREDENTIALS_ENCRYPTION_KEY", "ab".repeat(32));
});
describe("saved assistant credentials", () => {
  it("encrypts with a unique nonce and roundtrips without exposing the key", () => {
    const first = encryptCredential(
      "sk-or-private-test-key",
      "family-a",
      "parent-a",
    );
    expect(first).not.toContain("sk-or-private");
    expect(first).not.toEqual(
      encryptCredential("sk-or-private-test-key", "family-a", "parent-a"),
    );
    expect(decryptCredential(first, "family-a", "parent-a")).toBe(
      "sk-or-private-test-key",
    );
  });
  it("rejects cross-user, cross-workspace, modified and malformed ciphertext", () => {
    const value = encryptCredential(
      "sk-or-private-test-key",
      "family-a",
      "parent-a",
    );
    expect(() => decryptCredential(value, "family-b", "parent-a")).toThrow(
      "could not be opened",
    );
    expect(() => decryptCredential(value, "family-a", "parent-b")).toThrow(
      "could not be opened",
    );
    expect(() =>
      decryptCredential(
        value.slice(0, -1) + (value.endsWith("0") ? "1" : "0"),
        "family-a",
        "parent-a",
      ),
    ).toThrow();
    expect(() => decryptCredential("v1.bad", "family-a", "parent-a")).toThrow();
  });
  it("fails closed without an exact 256-bit server key and after key rotation", () => {
    const value = encryptCredential(
      "sk-or-private-test-key",
      "family-a",
      "parent-a",
    );
    vi.stubEnv("FINANCE_CREDENTIALS_ENCRYPTION_KEY", "cd".repeat(32));
    expect(() => decryptCredential(value, "family-a", "parent-a")).toThrow();
    vi.stubEnv("FINANCE_CREDENTIALS_ENCRYPTION_KEY", "bad");
    expect(canSaveCredentials()).toBe(false);
    expect(() => encryptCredential("secret", "family-a", "parent-a")).toThrow(
      "configured",
    );
  });
});
describe("bounded conversation memory", () => {
  it("keeps recent context and the latest question without mutating saved history", () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({
      role: "user" as const,
      content: `question ${i}`,
    }));
    const context = conversationContext(messages);
    expect(context).toHaveLength(11);
    expect(context.at(-1)?.content).toBe("question 39");
    expect(messages).toHaveLength(40);
  });
  it("bounds character cost and rejects oversized persistent conversations", () => {
    const messages = Array.from({ length: 20 }, () => ({
      role: "assistant" as const,
      content: "a".repeat(20000),
    }));
    expect(
      conversationContext(messages).reduce((n, m) => n + m.content.length, 0),
    ).toBe(18000);
    expect(() =>
      savedMessagesSchema.parse(Array(101).fill(messages[0])),
    ).toThrow();
  });
});
