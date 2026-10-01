import Link from "next/link";
import type { NewsItem } from "@/lib/content/news";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Variant = "default" | "compact" | "featured";

type Props =
  | {
      item: NewsItem;
      variant?: Variant;
      title?: never;
      date?: never;
      href?: never;
      summary?: never;
    }
  | {
      title: string;
      date: string;
      href: string;
      summary?: string;
      item?: never;
      variant?: Variant;
    };

export default function NewsCard(props: Props) {
  const variant: Variant = props.variant ?? "default";
  const title = props.item ? props.item.title : props.title;
  const date = props.item ? props.item.date : props.date;
  const href = props.item ? `/news/${props.item.slug}` : props.href;
  const summary = props.item ? props.item.summary : props.summary;
  const category = props.item?.category;

  let dateLabel = date;
  try {
    dateLabel = formatDate(date);
  } catch {
    /* keep */
  }

  if (variant === "compact") {
    return (
      <article className="border-b border-school-border py-4 last:border-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-school-muted">
          {category ? `${category} · ` : ""}
          <time dateTime={date}>{dateLabel}</time>
        </p>
        <h3 className="mt-1 font-serif text-lg font-semibold text-school-navy">
          <Link href={href} className="hover:text-school-blue">
            {title}
          </Link>
        </h3>
        {summary && (
          <p className="mt-1 line-clamp-2 text-sm text-school-slate">{summary}</p>
        )}
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article className="border-t-4 border-[#0c2340] bg-school-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-school-muted">
          {category ? `${category} · ` : ""}
          <time dateTime={date}>{dateLabel}</time>
        </p>
        <h3 className="mt-2 font-serif text-2xl font-bold text-school-navy sm:text-3xl">
          <Link href={href} className="hover:text-school-blue">
            {title}
          </Link>
        </h3>
        {summary && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-school-slate">
            {summary}
          </p>
        )}
        <Link
          href={href}
          className="mt-5 inline-block text-sm font-semibold text-school-blue hover:underline"
        >
          Read article →
        </Link>
      </article>
    );
  }

  return (
    <article className={cn("news-tile")}>
      <time dateTime={date}>{dateLabel}</time>
      {category && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-school-blue">
          {category}
        </p>
      )}
      <h3>
        <Link href={href} className="hover:text-school-blue">
          {title}
        </Link>
      </h3>
      {summary && (
        <p className="mt-2 line-clamp-3 text-sm text-school-slate">{summary}</p>
      )}
      <Link
        href={href}
        className="mt-auto pt-4 text-sm font-semibold text-school-blue hover:underline"
      >
        Read article →
      </Link>
    </article>
  );
}
