import { prisma } from "./lib/prisma"

async function main() {
  const result = await prisma.user.deleteMany({
    where: { email: "danworwood@gmail.com" }
  })
  console.log(`Deleted ${result.count} user(s)`)
}

main().catch(console.error)
