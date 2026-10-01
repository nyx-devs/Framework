import Link from "next/link";
import { announcement } from "@/lib/site";

export default function AnnouncementBar() {
  if (!announcement) return null;
  return (
    <div className="border-b border-white/10 bg-[#0c2340] text-white">
      <div className="container-page flex flex-col items-start justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e8c547]">
            {announcement.label}
          </p>
          <p className="mt-0.5 text-sm text-white/90">{announcement.text}</p>
        </div>
        <Link
          href={announcement.href}
          className="shrink-0 rounded-full border border-white/35 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {announcement.linkLabel} →
        </Link>
      </div>
    </div>
  );
}
