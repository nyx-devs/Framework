"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ensureProfile } from "@/lib/auth/profile";
import { resolveSiteUrl } from "@/lib/auth/site-url";

export type AuthResult = {
  error?: string;
  success?: string;
};

/**
 * The address to put in confirmation / reset emails. It has to match the address
 * the person is browsing on, or the PKCE cookie is not sent back and sign-in
 * fails. See lib/auth/site-url.ts.
 */
async function getSiteUrl() {
  const h = await headers();
  return resolveSiteUrl({
    origin: h.get("origin"),
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    envUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

export async function signUp(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!fullName || fullName.length < 2) {
    return { error: "Please enter your full name." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      // After clicking the link in the email, user lands on this route
      emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    // Friendly messages for common Supabase errors
    if (error.message.toLowerCase().includes("already registered")) {
      return {
        error:
          "An account with this email already exists. Please sign in or reset your password.",
      };
    }
    if (error.message.toLowerCase().includes("rate limit")) {
      return {
        error:
          "Too many attempts. Please wait a few minutes before trying again.",
      };
    }
    return { error: error.message };
  }

  // If email confirmation is required, user will not have a session yet
  // Redirect to check-email page regardless so they know to open their inbox
  redirect(
    `/auth/check-email?email=${encodeURIComponent(email)}`
  );
}

export async function signIn(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirect") || "/dashboard");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
      };
    }
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "Incorrect email or password." };
    }
    return { error: error.message };
  }

  // Guarantee a profiles row exists (trigger may be missing in some projects)
  if (signInData.user) {
    await ensureProfile(signInData.user);
  }

  // Only allow relative redirects
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";

  redirect(safeRedirect);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resetPasswordRequest(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  // Always show success to avoid email enumeration
  return {
    success:
      "If an account exists for that email, you will receive a password reset link shortly. Please check your inbox and spam folder.",
  };
}

export async function updatePassword(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Your reset session has expired. Please request a new password reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.message.toLowerCase().includes("session")) {
      return {
        error:
          "Your reset session has expired. Please request a new password reset link.",
      };
    }
    return { error: error.message };
  }

  redirect("/login?password=updated");
}

/**
 * Start Discord OAuth via Supabase Auth (not a separate auth system).
 * Requires Discord provider enabled in the Supabase dashboard.
 */
export async function signInWithDiscord(
  redirectTo = "/dashboard"
): Promise<AuthResult> {
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const safeNext =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      scopes: "identify email",
    },
  });

  if (error) {
    return { error: error.message || "Could not start Discord sign-in." };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Could not start Discord sign-in." };
}
