"use client";

import { siteConfig } from "@/config/site";
import { LogoMark } from "../brand/Logo";

export function WelcomeScreen({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <section className="relative flex min-h-full flex-col items-center justify-center px-4 py-6 sm:py-14" aria-labelledby="welcome-title">
      <div className="plot-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="relative flex w-full max-w-2xl flex-col items-center text-center">
        <LogoMark size={48} />
        <h1 id="welcome-title" className="mt-4 font-display text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
          How can I help you today?
        </h1>
        <p className="mt-3 max-w-md text-[15px] text-pretty text-muted">
          Choose what you’re looking for, or ask {siteConfig.assistantName} anything about property with {siteConfig.companyName}.
        </p>

        <ul className="mt-8 grid w-full grid-cols-2 gap-2.5 sm:gap-3" aria-label="What are you looking for?">
          {siteConfig.examplePrompts.map((p) => (
            <li key={p.title}>
              <button
                type="button"
                onClick={() => onPick(p.prompt)}
                className="group relative h-full w-full rounded-xl border border-line bg-surface/90 px-3.5 py-3 text-left sm:p-4 backdrop-blur-[1px] transition-colors hover:border-pine hover:bg-surface"
              >
                {/* survey-peg corners */}
                <span className="absolute -top-px -left-px size-2.5 rounded-tl-xl border-t-2 border-l-2 border-brass" aria-hidden="true" />
                <span className="absolute -right-px -bottom-px size-2.5 rounded-br-xl border-r-2 border-b-2 border-brass opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                <span className="block font-display text-[14px] font-semibold sm:text-[15px]">{p.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted sm:text-sm">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
