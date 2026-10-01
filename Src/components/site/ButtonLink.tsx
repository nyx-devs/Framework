import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "onDark" | "outlineOnDark";

const variants: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  onDark: "btn btn-on-dark",
  outlineOnDark: "btn btn-outline-on-dark",
};

export default function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  external?: boolean;
}) {
  const classes = cn(variants[variant], className);
  if (external || href.startsWith("http")) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
