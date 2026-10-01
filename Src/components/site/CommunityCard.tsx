import Link from "next/link";

export default function CommunityCard({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[210px] flex-col justify-end overflow-hidden bg-[#0c2340] p-6 text-white transition hover:bg-[#132d4f]"
    >
      <h3 className="font-serif text-xl font-semibold leading-snug group-hover:underline">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{text}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#e8c547]">
        {label} <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
