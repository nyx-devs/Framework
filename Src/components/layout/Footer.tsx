import Link from "next/link";
import { contactEmail, discordInviteUrl, site } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto">
      {/* Pre-footer */}
      <div className="border-t border-school-border bg-school-surface">
        <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-serif text-lg font-semibold text-school-navy">{site.name}</p>
            <p className="mt-1 text-sm text-school-muted">{site.tagline}</p>
            <p className="mt-3 text-sm font-medium text-[#c9a227]">{site.motto}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-school-muted">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-school-slate">
              {[
                ["/about", "About us"],
                ["/school-life", "Our school"],
                ["/students", "Pupils"],
                ["/parents", "Parents"],
                ["/news", "News"],
              ].map(([h, l]) => (
                <li key={h}>
                  <Link href={h} className="hover:text-school-blue">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-school-muted">School</p>
            <ul className="mt-3 space-y-2 text-sm text-school-slate">
              {[
                ["/our-staff", "Our staff"],
                ["/slt", "Leadership"],
                ["/positions", "Vacancies"],
                ["/safeguarding", "Safeguarding"],
                ["/policies", "Policies"],
              ].map(([h, l]) => (
                <li key={h}>
                  <Link href={h} className="hover:text-school-blue">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-school-muted">Access</p>
            <ul className="mt-3 space-y-2 text-sm text-school-slate">
              <li>
                <Link href="/dashboard" className="hover:text-school-blue">
                  Student portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-school-blue">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-school-blue">
                  Contact
                </Link>
              </li>
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className="hover:text-school-blue">
                    {contactEmail}
                  </a>
                </li>
              )}
              {discordInviteUrl && (
                <li>
                  <a
                    href={discordInviteUrl}
                    className="hover:text-school-blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Discord
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#0c2340] text-white">
        <div className="school-stripe" aria-hidden />
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:justify-between">
          <p>
            © {year} {site.name}
          </p>
          <p className="max-w-xl sm:text-right">{site.rpNotice}</p>
        </div>
      </div>
    </footer>
  );
}
