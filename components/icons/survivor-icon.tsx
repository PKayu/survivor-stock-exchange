export function SurvivorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 12 8 8" />
      <path d="M12 12l4 4" />
      <path d="M12 12v6" />
      <path d="M12 12l-4-4" />
      <path d="M12 12 8 16" />
    </svg>
  )
}
