"use client";

import { siteConfig } from "@/config/site";
import { LogoMark } from "../brand/Logo";

export function WelcomeScreen({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <section className="relative flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-16" aria-labelledby="welcome-title">
      <div className="plot-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="relative flex w-full max-w-2xl flex-col items-center text-center">
        <LogoMark size={56} />
        <h1 id="welcome-title" className="mt-6 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          How can I help you today?
        </h1>
        <p className="mt-3 max-w-md text-[15px] text-pretty text-muted">
          Ask {siteConfig.assistantName} anything about buying, selling or renting property with {siteConfig.companyName}.
        </p>

        <ul className="mt-9 grid w-full grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Example questions">
          {siteConfig.examplePrompts.map((p) => (
            <li key={p.title}>
              <button
                type="button"
                onClick={() => onPick(p.prompt)}
                className="group relative h-full w-full rounded-xl border border-line bg-surface/90 p-4 text-left backdrop-blur-[1px] transition-colors hover:border-pine hover:bg-surface"
              >
                {/* survey-peg corners */}
                <span className="absolute -top-px -left-px size-2.5 rounded-tl-xl border-t-2 border-l-2 border-brass" aria-hidden="true" />
                <span className="absolute -right-px -bottom-px size-2.5 rounded-br-xl border-r-2 border-b-2 border-brass opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                <span className="block font-display text-[15px] font-semibold">{p.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm text-muted">{p.prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
