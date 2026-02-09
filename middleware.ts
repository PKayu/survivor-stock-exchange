import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export default auth((req) => {
  const path = req.nextUrl.pathname
  const token = req.auth
  const isAdmin = token?.isAdmin as boolean | undefined

  // Protected paths
  const isProtectedPath =
    path.startsWith("/dashboard") ||
    path.startsWith("/trade") ||
    path.startsWith("/ratings") ||
    path.startsWith("/portfolio") ||
    path.startsWith("/standings") ||
    path.startsWith("/contestants")

  const isAdminPath = path.startsWith("/admin/")

  if (isProtectedPath && !token) {
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
