import Link from "next/link";

/** A quiet row of links at the bottom of a page. Replaces repeated sidebar boxes. */
export default function RelatedLinks({
  links,
  title = "Also see",
}: {
  links: { label: string; href: string }[];
  title?: string;
}) {
  return (
    <nav aria-label={title} className="mt-12 border-t border-school-border pt-5">
      <p className="eyebrow text-school-muted">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-semibold text-school-blue underline underline-offset-4 hover:text-school-navy"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
