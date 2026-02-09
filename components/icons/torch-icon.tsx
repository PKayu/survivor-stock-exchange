"use client"

import { cn } from "@/lib/utils"

interface TorchIconProps {
  className?: string
  size?: "sm" | "md" | "lg"
  animated?: boolean
}

export function TorchIcon({ className, size = "md", animated = true }: TorchIconProps) {
  const sizeClasses = {
    sm: "w-6 h-10",
    md: "w-8 h-14",
    lg: "w-12 h-20",
  }

  return (
    <div className={cn("relative flex flex-col items-center", sizeClasses[size], className)}>
      {/* Flame */}
      <div
        className={cn(
          "relative w-full flex-shrink-0",
          size === "sm" && "h-4",
          size === "md" && "h-6",
          size === "lg" && "h-8",
          animated && "animate-flicker"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-amber-300 to-primary/50 rounded-full blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary to-amber-300 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]" />
        <div className="absolute inset-x-1/4 bottom-0 top-1/4 bg-amber-300/80 rounded-full blur-[2px]" />
      </div>
      {/* Handle */}
      <div
        className={cn(
          "w-1/3 flex-grow rounded-b-sm bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900",
          size === "sm" && "min-h-5",
          size === "md" && "min-h-7",
          size === "lg" && "min-h-10"
        )}
      />
    </div>
  )
}
