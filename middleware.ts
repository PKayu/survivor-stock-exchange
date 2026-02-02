import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname
    const token = req.nextauth.token
    const isAdmin = token?.isAdmin as boolean | undefined

    // Redirect unauthenticated users trying to access protected pages
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
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

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
