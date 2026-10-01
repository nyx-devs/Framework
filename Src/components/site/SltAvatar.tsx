"use client";

import { useState } from "react";

/**
 * Portrait for an SLT member. Falls back to initials if there is no image or
 * the image file is missing, so a wrong path never shows a broken picture.
 */
export default function SltAvatar({
  src,
  name,
  className = "",
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center bg-school-blue-light font-serif text-3xl font-semibold text-school-blue ${className}`}
      >
        {initials || "—"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={`bg-school-blue-light object-cover ${className}`}
    />
  );
}
