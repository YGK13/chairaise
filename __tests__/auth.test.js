// @vitest-environment node
// ============================================================
// ChaiRaise — Credentials auth fails CLOSED on account-store errors,
// and OAuth owner sign-ins require a provider-verified email.
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let nextAuthConfig;
vi.mock("next-auth", () => ({
  default: (cfg) => {
    nextAuthConfig = cfg;
    return { handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() };
  },
}));
vi.mock("next-auth/providers/google", () => ({ default: (c) => ({ id: "google", ...c }) }));
vi.mock("next-auth/providers/linkedin", () => ({ default: (c) => ({ id: "linkedin", ...c }) }));
vi.mock("next-auth/providers/credentials", () => ({ default: (c) => ({ id: "credentials", ...c }) }));

const db = {
  getAccountByEmail: vi.fn(),
  createAccount: vi.fn(),
  verifyPassword: vi.fn(),
  touchAccountLogin: vi.fn(),
  recordOAuthAccount: vi.fn(),
};
vi.mock("@/lib/db", () => db);

const { authorizeCredentials } = await import("@/lib/auth");

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("authorizeCredentials", () => {
  it("fails closed when the account store throws and a database is configured", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://prod");
    db.getAccountByEmail.mockRejectedValue(new Error("neon blip"));
    expect(await authorizeCredentials({ email: "victim@shul.org", password: "anything" })).toBeNull();
  });

  it("fails closed on store errors in production even without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    db.getAccountByEmail.mockRejectedValue(new Error("no db"));
    expect(await authorizeCredentials({ email: "victim@shul.org", password: "anything" })).toBeNull();
  });

  it("keeps the local-dev login only with no DATABASE_URL outside production", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    db.getAccountByEmail.mockRejectedValue(new Error("no db"));
    expect(await authorizeCredentials({ email: "dev@shul.org", password: "secret1" })).toMatchObject({ email: "dev@shul.org" });
  });

  it("rejects a wrong password for an existing account", async () => {
    db.getAccountByEmail.mockResolvedValue({ email: "a@b.org", password_hash: "h" });
    db.verifyPassword.mockReturnValue(false);
    expect(await authorizeCredentials({ email: "a@b.org", password: "wrongpw" })).toBeNull();
  });

  it("never allows owner emails through credentials", async () => {
    expect(await authorizeCredentials({ email: "x@ohrvishua.org", password: "secret1" })).toBeNull();
    expect(db.getAccountByEmail).not.toHaveBeenCalled();
  });
});

describe("signIn callback — OAuth owner emails", () => {
  const signIn = (args) => nextAuthConfig.callbacks.signIn(args);

  it("rejects an owner email whose provider did not verify it", async () => {
    expect(await signIn({ user: { email: "x@ohrvishua.org" }, account: { provider: "google" }, profile: { email_verified: false } })).toBe(false);
    expect(await signIn({ user: { email: "x@ohrvishua.org" }, account: { provider: "linkedin" }, profile: {} })).toBe(false);
  });

  it("allows a verified owner email", async () => {
    expect(await signIn({ user: { email: "x@ohrvishua.org" }, account: { provider: "google" }, profile: { email_verified: true } })).toBe(true);
  });

  it("does not treat look-alike domains as owner", async () => {
    // Not an owner email, so normal OAuth sign-in proceeds (as a regular user).
    expect(await signIn({ user: { email: "x@ohrvishua.evil.com" }, account: { provider: "google" }, profile: { email_verified: true } })).toBe(true);
  });
});
