import { site } from "@/lib/site";

/** The plain-English "this is roleplay" note. Used where it matters most. */
export default function RpNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`border-l-4 border-school-blue bg-school-blue-light px-4 py-3 ${className}`}>
      <p className="eyebrow text-school-blue">Please note</p>
      <p className="mt-1 text-[0.9375rem] text-school-navy">{site.rpNotice}</p>
    </div>
  );
}
