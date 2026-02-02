"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SurvivorIcon } from "./icons/survivor-icon"

export function NavHeader() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <SurvivorIcon className="h-6 w-6" />
              <span className="font-bold text-lg">Survivor Stock Exchange</span>
            </Link>
          </div>
          <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <SurvivorIcon className="h-6 w-6" />
            <span className="font-bold text-lg">Survivor Stock Exchange</span>
          </Link>

          {session && (
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link href="/trade">
                <Button variant="ghost" size="sm">Trade</Button>
              </Link>
              <Link href="/ratings">
                <Button variant="ghost" size="sm">Ratings</Button>
              </Link>
              <Link href="/portfolio">
                <Button variant="ghost" size="sm">Portfolio</Button>
              </Link>
              <Link href="/standings">
                <Button variant="ghost" size="sm">Standings</Button>
              </Link>
              <Link href="/contestants">
                <Button variant="ghost" size="sm">Contestants</Button>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {session.user?.name?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block text-sm">
                    {session.user?.name}
                  </span>
                  {session.user?.isAdmin && (
                    <Badge variant="secondary" className="ml-1">Admin</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/portfolio">My Portfolio</Link>
                </DropdownMenuItem>
                {session.user?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Admin</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard">Admin Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/seasons">Seasons</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/contestants">Contestants</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/players">Players</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/phases">Phases</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/achievements">Achievements</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
