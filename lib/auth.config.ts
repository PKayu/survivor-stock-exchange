import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (!session.user?.email) return session

      const fallbackUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          isAdmin: true,
          onboardingCompleted: true,
        },
      })

      const resolvedId = user?.id ?? fallbackUser?.id
      if (!resolvedId) return session

      session.user.id = resolvedId
      session.user.isAdmin =
        user && "isAdmin" in user ? Boolean(user.isAdmin) : Boolean(fallbackUser?.isAdmin)
      session.user.onboardingCompleted =
        user && "onboardingCompleted" in user
          ? Boolean(user.onboardingCompleted)
          : Boolean(fallbackUser?.onboardingCompleted)

      return session
    },
  },
}
