import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  draft: "pill pill-neutral",
  submitted: "pill pill-info",
  under_review: "pill pill-info",
  "under review": "pill pill-info",
  more_information_requested: "pill pill-warning",
  "more information requested": "pill pill-warning",
  interview_required: "pill pill-warning",
  "interview required": "pill pill-warning",
  accepted: "pill pill-success",
  rejected: "pill pill-danger",
  withdrawn: "pill pill-neutral",
  open: "pill pill-info",
  closed: "pill pill-neutral",
  resolved: "pill pill-success",
};

export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = (status || "").toLowerCase().replace(/_/g, " ");
  const cls =
    map[status?.toLowerCase()] ||
    map[key] ||
    "pill pill-neutral";
  const label = (status || "Unknown").replace(/_/g, " ");
  return (
    <span className={cn(cls, "capitalize", className)}>{label}</span>
  );
}
