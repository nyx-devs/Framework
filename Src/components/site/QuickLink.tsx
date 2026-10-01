import Link from "next/link";

/** One cell in the quick links bar under the hero. */
export default function QuickLink({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col bg-white px-5 py-4 transition-colors hover:bg-school-blue-light"
    >
      <span className="font-serif text-lg font-semibold text-school-navy group-hover:text-school-blue">
        {title} <span aria-hidden="true">→</span>
      </span>
      <span className="mt-0.5 text-[0.9375rem] text-school-muted group-hover:text-school-slate">
        {text}
      </span>
    </Link>
  );
}
