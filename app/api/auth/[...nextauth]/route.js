// ============================================================
// ChaiRaise — NextAuth.js API Route Handler
// Handles: /api/auth/signin, /api/auth/signout, /api/auth/session, etc.
// ============================================================
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
