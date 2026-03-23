// ============================================================
// ChaiRaise — NextAuth.js v5 Configuration
// Supports: Google, LinkedIn, Email/Password (Credentials)
// ============================================================
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // ---- Google OAuth ----
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ---- LinkedIn OAuth ----
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    }),

    // ---- Email/Password (Credentials) ----
    // For users who prefer traditional login without OAuth
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@yourorg.org" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // In production, this would validate against a database
        // For MVP, we accept any email/password and create a session
        // The CRM's localStorage handles the actual user/org data
        if (!credentials?.email || !credentials?.password) return null;
        if (String(credentials.password).length < 6) return null;

        return {
          id: String(credentials.email).toLowerCase(),
          email: String(credentials.email).toLowerCase(),
          name: String(credentials.email).split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        };
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin", // Custom sign-in page
  },

  callbacks: {
    // Add user info to the session
    async session({ session, token }) {
      if (token?.sub) session.user.id = token.sub;
      if (token?.provider) session.user.provider = token.provider;
      return session;
    },

    // Store provider info in the JWT token
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
  },

  // Security settings
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Secret for JWT signing (auto-generated in dev, set NEXTAUTH_SECRET in production)
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
});
