import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      isAdmin: boolean
      onboardingCompleted: boolean
    }
  }

  interface User {
    isAdmin: boolean
    onboardingCompleted: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isAdmin: boolean
    onboardingCompleted: boolean
  }
}
