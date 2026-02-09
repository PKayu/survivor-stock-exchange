import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Test basic connection
    const userCount = await prisma.user.count()

    // Get list of tables in the public schema
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // Test creating a simple query (without modifying data)
    const firstUser = await prisma.user.findFirst({
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({
      status: "connected",
      userCount,
      tables: tables.map((t) => t.table_name),
      firstUser,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database debug error:", error)
    return NextResponse.json(
      {
        status: "error",
        error: String(error),
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
