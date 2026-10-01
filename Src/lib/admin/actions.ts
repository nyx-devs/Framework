"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  verifyAdminPassword,
  isAdminEmailAllowed,
} from "@/lib/admin/session";
import { writeAuditLog } from "@/lib/audit";

export type AdminAuthResult = { error?: string };

export async function adminLogin(
  _prev: AdminAuthResult,
  formData: FormData
): Promise<AdminAuthResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  if (!process.env.BLUEBIRD_ADMIN_PASSWORD) {
    return {
      error:
        "Admin login is not configured. Set BLUEBIRD_ADMIN_PASSWORD on the server.",
    };
  }

  if (!isAdminEmailAllowed(email)) {
    return { error: "This account is not authorised for admin access." };
  }

  // Constant-time-ish: always run verify even if email not allowed... we already returned
  const ok = verifyAdminPassword(password);
  if (!ok) {
    return { error: "Incorrect email or password." };
  }

  await createAdminSession(email);

  try {
    await writeAuditLog({
      action: "login",
      entityType: "admin",
      details: { email, via: "admin_panel" },
    });
  } catch {
    // ignore
  }

  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
