import Link from "next/link";

export default function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  action,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2
          id={id}
          className={`font-serif text-2xl font-semibold text-school-navy sm:text-3xl ${eyebrow ? "mt-2" : ""}`}
        >
          {title}
        </h2>
        {intro && <p className="mt-2 text-school-slate">{intro}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-semibold text-school-blue hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
