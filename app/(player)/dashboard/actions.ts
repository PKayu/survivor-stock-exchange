"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function completeOnboarding() {
  const session = await auth()

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true },
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error marking onboarding complete:", error)
    return { error: "Failed to update onboarding status" }
  }
}
