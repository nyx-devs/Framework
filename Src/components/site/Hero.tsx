import Image from "next/image";
import ButtonLink from "./ButtonLink";
import { robloxExperienceUrl, site } from "@/lib/site";

export default function Hero() {
  return (
    <section aria-labelledby="welcome-heading" className="relative">
      <div className="relative h-[min(56vw,460px)] min-h-[280px] w-full overflow-hidden bg-[#0c2340] lg:h-[520px]">
        <Image
          src="/assets/banner1.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0c2340]/90 via-[#0c2340]/50 to-[#0c2340]/20"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-end">
          <div className="container-page w-full pb-12 pt-20 sm:pb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e8c547]">
              {site.motto}
            </p>
            <p className="mt-4 text-sm font-medium text-white/75 sm:text-base">
              Welcome to
            </p>
            <h1
              id="welcome-heading"
              className="mt-1 max-w-3xl font-serif text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl"
            >
              {site.name}
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/dashboard" variant="onDark">
                Student portal
              </ButtonLink>
              {robloxExperienceUrl ? (
                <ButtonLink href={robloxExperienceUrl} variant="outlineOnDark" external>
                  Visit on Roblox
                </ButtonLink>
              ) : (
                <ButtonLink href="/about" variant="outlineOnDark">
                  About us
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
