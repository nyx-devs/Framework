import type { SltMember } from "@/lib/content/slt";
import SltAvatar from "./SltAvatar";

export function isVacant(member: SltMember) {
  return member.name.trim().toLowerCase() === "vacant";
}

/**
 * Portrait card in the style of a school leadership page: photo on top,
 * then name, role and (optionally) a short description.
 * "compact" is the small version used on the home page.
 */
export default function SltMemberCard({
  member,
  compact = false,
}: {
  member: SltMember;
  compact?: boolean;
}) {
  const vacant = isVacant(member);
  const hasRoblox = member.robloxUsername && member.robloxUsername !== "—";

  return (
    <article
      className={`flex h-full flex-col border ${
        vacant ? "border-dashed border-school-border bg-school-surface" : "border-school-border bg-white"
      }`}
    >
      {vacant ? (
        <div
          aria-hidden="true"
          className="flex aspect-square w-full items-center justify-center bg-school-surface font-serif text-4xl text-school-muted"
        >
          —
        </div>
      ) : (
        <SltAvatar src={member.profileImage} name={member.name} className="aspect-square w-full" />
      )}

      <div className="flex flex-1 flex-col border-t border-school-border p-4">
        <h3 className="font-serif text-lg font-semibold leading-snug text-school-navy">
          {vacant ? "Position vacant" : member.name}
        </h3>
        <p className="text-[0.9375rem] font-semibold text-school-blue">{member.role}</p>

        {!compact && (
          <>
            {(hasRoblox || member.department) && (
              <p className="mt-2 text-sm text-school-muted">
                {hasRoblox && <>Roblox: @{member.robloxUsername}</>}
                {hasRoblox && member.department && <span aria-hidden="true"> · </span>}
                {member.department}
              </p>
            )}
            {!vacant && member.shortDescription && (
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-school-slate">
                {member.shortDescription}
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
