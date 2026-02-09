import { prisma } from "./lib/prisma"

async function main() {
  // Check all tables
  const users = await prisma.user.findMany({ include: { accounts: true } })
  console.log('=== USERS ===')
  for (const u of users) {
    console.log(`- ${u.email} | isAdmin: ${u.isAdmin} | image: ${u.image} | accounts: ${u.accounts.length}`)
    for (const acc of u.accounts) {
      console.log(`  Account: ${acc.provider} (${acc.providerAccountId})`)
    }
  }

  console.log('\n=== SESSIONS ===')
  const sessions = await prisma.session.findMany({ include: { user: true } })
  console.log(`Total sessions: ${sessions.length}`)
  for (const s of sessions) {
    console.log(`- User: ${s.user?.email} | expires: ${s.expires}`)
  }
}

main().catch(console.error)
