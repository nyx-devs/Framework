import { dayOfMonth, formatLongDate, shortMonth } from "@/lib/format";
import type { SchoolEvent } from "@/lib/content/events";

/** An event row: navy date block on the left, details on the right. */
export default function EventCard({
  event,
  showDescription = true,
}: {
  event: SchoolEvent;
  showDescription?: boolean;
}) {
  return (
    <article className="flex gap-4">
      <div
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center bg-school-navy text-white"
      >
        <span className="font-serif text-2xl font-semibold leading-none">
          {dayOfMonth(event.date)}
        </span>
        <span className="eyebrow mt-1 text-school-accent">{shortMonth(event.date)}</span>
      </div>
      <div className="min-w-0">
        <p className="eyebrow text-school-blue">{event.category}</p>
        <h3 className="font-serif text-xl font-semibold leading-snug text-school-navy">
          {event.title}
        </h3>
        <p className="mt-1 text-[0.9375rem] text-school-muted">
          <time dateTime={event.date}>{formatLongDate(event.date)}</time>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {event.time}
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {event.location}
        </p>
        {showDescription && <p className="mt-2 text-school-slate">{event.description}</p>}
      </div>
    </article>
  );
}
