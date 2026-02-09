import { prisma } from "./lib/prisma"

async function main() {
  const users = await prisma.user.findMany({
    include: { accounts: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  console.log('Users:')
  for (const user of users) {
    console.log(`- ${user.email} (${user.name})`)
    console.log(`  Accounts: ${user.accounts.length}`)
    for (const account of user.accounts) {
      console.log(`    - ${account.provider}: ${account.providerAccountId}`)
    }
  }
}

main().catch(console.error)
