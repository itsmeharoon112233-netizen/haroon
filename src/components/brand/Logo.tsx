import { cn } from "@/lib/utils";

/** Brand mark: a home roofline over a stupa arch, in brass. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-pine" />
      <path d="M14 46V31L32 17l18 14v15" fill="none" className="stroke-on-pine" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M25 46v-8a7 7 0 0 1 14 0v8" fill="none" className="stroke-brass" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
