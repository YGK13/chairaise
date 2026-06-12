// ============================================================
// ChaiRaise — NextAuth.js v5 Configuration
// Supports: Google, LinkedIn, Email/Password (Credentials)
// Only includes OAuth providers when credentials are configured
// ============================================================
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import Credentials from "next-auth/providers/credentials";
import { getAccountByEmail, createAccount, verifyPassword, touchAccountLogin, recordOAuthAccount } from "@/lib/db";
import { isOwnerEmail } from "@/lib/plan";

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Derive a friendly display name from an email local-part.
const nameFromEmail = (email) =>
  String(email).split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Build providers list — only include OAuth when keys exist
const providers = [
  // ---- Email/Password ----
  // Frictionless for NEW emails (first sign-in registers an account with a
  // hashed password), but SECURE for returning accounts (password is verified
  // against the stored hash — you can no longer log into someone else's email).
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "you@yourorg.org" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email || "").trim().toLowerCase();
      const password = String(credentials?.password || "");
      if (!email || password.length < 6) return null;

      const ok = { id: email, email, name: nameFromEmail(email) };

      try {
        const account = await getAccountByEmail(email);

        if (account) {
          // Returning account — password must match the stored hash.
          if (!account.password_hash) {
            // Account exists via OAuth only; refuse credential login.
            return null;
          }
          if (!verifyPassword(password, account.password_hash)) return null;
          await touchAccountLogin(email);
          return { ...ok, name: account.name || ok.name };
        }

        // No account yet for this email.
        // Owner emails are high-value: once Google is configured they MUST use
        // the verified OAuth path, so nobody can "claim" the address here.
        if (isOwnerEmail(email) && googleConfigured) return null;

        // First-time sign-in for a normal email → self-register securely.
        await createAccount({ email, password, name: ok.name });
        return ok;
      } catch (e) {
        // DB unavailable (local/dev without DATABASE_URL). Never let an owner
        // email through unverified; allow ordinary demo/dev logins.
        console.warn("[auth] account store unavailable:", e.message);
        if (isOwnerEmail(email)) return null;
        return ok;
      }
    },
  }),
];

// Conditionally add Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Conditionally add LinkedIn OAuth
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  providers.push(
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,

  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },

  callbacks: {
    async signIn({ user, account }) {
      // Persist OAuth identities (no password hash) so the email is bound to the
      // OAuth provider and cannot be claimed via credentials afterwards.
      if (account && account.provider !== "credentials" && user?.email) {
        try {
          await recordOAuthAccount({
            email: user.email,
            name: user.name || "",
            provider: account.provider,
          });
        } catch (e) {
          console.warn("[auth] could not record OAuth account:", e.message);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.sub) session.user.id = token.sub;
      if (token?.provider) session.user.provider = token.provider;
      return session;
    },
    async jwt({ token, account }) {
      if (account) token.provider = account.provider;
      return token;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
