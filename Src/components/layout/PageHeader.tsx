import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export default function PageHeader({
  title,
  intro,
  crumbs = [],
}: {
  title: string;
  intro?: string;
  crumbs?: Crumb[];
}) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...crumbs, { label: title }];

  return (
    <div className="border-b border-school-border bg-school-surface">
      <div className="container-page py-9 sm:py-11">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 text-sm text-school-muted">
            {trail.map((crumb, index) => {
              const last = index === trail.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {crumb.href && !last ? (
                    <Link href={crumb.href} className="text-school-blue hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={last ? "font-medium text-school-navy" : undefined}
                      aria-current={last ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {!last && <span aria-hidden className="text-school-border">/</span>}
                </li>
              );
            })}
          </ol>
        </nav>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-school-navy sm:text-4xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-school-slate">
            {intro}
          </p>
        )}
      </div>
    </div>
  );
}
