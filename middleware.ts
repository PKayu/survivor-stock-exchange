import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export default auth(async (req) => {
  const path = req.nextUrl.pathname
  const session = req.auth
  let isAdmin = Boolean(session?.user?.isAdmin)

  // Protected paths
  const isProtectedPath =
    path.startsWith("/dashboard") ||
    path.startsWith("/trade") ||
    path.startsWith("/ratings") ||
    path.startsWith("/portfolio") ||
    path.startsWith("/standings") ||
    path.startsWith("/contestants")

  const isAdminPath = path.startsWith("/admin/")

  if (isAdminPath && session?.user?.email && !isAdmin) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    })
    isAdmin = Boolean(dbUser?.isAdmin)
  }

  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAdminPath && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trade/:path*",
    "/ratings/:path*",
    "/portfolio/:path*",
    "/standings/:path*",
    "/contestants/:path*",
    "/admin/:path*",
  ],
}
