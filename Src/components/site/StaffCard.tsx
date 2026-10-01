import type { StaffRole } from "@/lib/content/staff";

/** A role in the staff structure. Shows names only if they have been added. */
export default function StaffCard({ role }: { role: StaffRole }) {
  return (
    <div className="border-t-2 border-school-border pt-3">
      <h3 className="font-serif text-lg font-semibold text-school-navy">{role.title}</h3>
      <p className="mt-1 text-[0.9375rem] text-school-slate">{role.description}</p>
      {role.people && role.people.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[0.9375rem] font-semibold text-school-navy">
          {role.people.map((person) => (
            <li key={person.name}>
              {person.name}
              {person.department && (
                <span className="font-normal text-school-muted"> · {person.department}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
