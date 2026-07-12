import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Behind Cloudflare Tunnel — Auth.js v5 refuses the request otherwise
  // ("UntrustedHost"). Safe because we terminate TLS at the proxy we control.
  trustHost: true,
  // JWT strategy avoids DB-adapter session lookups on every request AND
  // avoids a category of "cookie set but session missing" edge cases we hit
  // with the database strategy behind this tunnel.
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Explicit cookie config — force plain "authjs.session-token" (no __Secure-
  // prefix) with SameSite=Lax. The __Secure- prefix was silently rejected by
  // the browser through the Cloudflare Tunnel path even though curl accepted
  // it, so we side-step it here.
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  callbacks: {
    // With JWT strategy the adapter's user row exists but the client-side
    // session doesn't automatically carry `user.id`. Copy it through so
    // /api/keys/rotate etc. can find whose account they're mutating.
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.uid === "string") {
        session.user.id = token.uid;
      }
      return session;
    },
  },
  // No custom signIn page — otherwise /api/auth/signin bounces back to "/".
});
