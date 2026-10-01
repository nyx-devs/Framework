/** A titled box for sidebars: thin border, small heading, no shadow. */
export default function SidebarBox({
  title,
  children,
  tone = "plain",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "plain" | "tint";
}) {
  return (
    <aside
      className={
        tone === "tint"
          ? "border border-school-border bg-school-blue-light p-5"
          : "border border-school-border bg-white p-5"
      }
    >
      <h2 className="eyebrow border-b border-school-border pb-2 text-school-blue">{title}</h2>
      <div className="mt-3 text-[0.9375rem] text-school-slate">{children}</div>
    </aside>
  );
}
