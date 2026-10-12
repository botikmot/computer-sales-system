"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  changeMyPassword,
  getMyAccount,
  updateMyProfile,
  type AccountUser,
} from "@/features/settings/account-api";

import { USER_KEY } from "@/lib/auth/session";

const inputClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-slate-500";

function roleLabel(role: AccountUser["role"]): string {
  const labels: Record<AccountUser["role"], string> = {
    ADMIN: "Administrator",
    MANAGER: "Manager",
    SALES: "Sales",
    PURCHASING: "Purchasing",
    INVENTORY: "Inventory",
    TECHNICIAN: "Technician",
    CASHIER: "Cashier",
  };
  return labels[role];
}

function statusClass(status: AccountUser["status"]): string {
  return status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";
}

export default function AccountSettingsPage() {
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const result = await getMyAccount();
        if (cancelled) return;
        setAccount(result);
        setFullName(result.fullName ?? "");
        setEmail(result.email ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load account settings.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProfileMessage("");

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      setError("Full name must contain at least 2 characters.");
      return;
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setError("Enter a valid email address, or leave it blank.");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        fullName: normalizedName,
        email: normalizedEmail || null,
      });

      setAccount(updated);
      setFullName(updated.fullName);
      setEmail(updated.email ?? "");

      // Keep the local session's safe user snapshot in sync with the API.
      window.localStorage.setItem(USER_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("compflow-auth-change"));
      setProfileMessage("Your profile has been updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update your profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        "Choose a new password that is different from your current password.",
      );
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(result.message || "Your password has been changed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to change your password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <AppShell>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Settings
            </Link>
            <p className="mt-4 text-sm font-semibold text-primary">Security</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Account Settings
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Update your personal details and keep your sign-in credentials
              secure.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <UserRound className="h-6 w-6" />
          </div>
        </div>

        {error && (
          <div
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Loading your
            account…
          </div>
        ) : !account ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Account details could not be loaded. Refresh the page and try again.
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Personal Information
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Only your own profile information can be changed here.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleProfileSubmit}
                className="space-y-5 p-5 sm:p-6"
              >
                {profileMessage && (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                    role="status"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />{" "}
                    {profileMessage}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Full Name
                    <input
                      className={inputClassName}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Email Address{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                    <input
                      className={inputClassName}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      maxLength={255}
                      autoComplete="email"
                      placeholder="name@example.com"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Username
                    <input
                      className={inputClassName}
                      value={account.username}
                      disabled
                      readOnly
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Role
                    <input
                      className={inputClassName}
                      value={roleLabel(account.role)}
                      disabled
                      readOnly
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Branch
                    <input
                      className={inputClassName}
                      value={account.branch?.name ?? "Not assigned"}
                      disabled
                      readOnly
                    />
                  </label>
                  <div className="text-sm font-medium text-slate-700">
                    Account Status
                    <div className="mt-1.5 flex h-11 items-center">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(account.status)}`}
                      >
                        {account.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingProfile ? "Saving…" : "Save Profile"}
                  </button>
                </div>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Change Password
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Confirm your current password before choosing a new one.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                className="space-y-5 p-5 sm:p-6"
              >
                {passwordMessage && (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                    role="status"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />{" "}
                    {passwordMessage}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                    Current Password
                    <input
                      className={inputClassName}
                      type="password"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      required
                      autoComplete="current-password"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    New Password
                    <input
                      className={inputClassName}
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                    />
                    <span className="mt-1.5 block text-xs font-normal text-slate-500">
                      Use at least 8 characters.
                    </span>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Confirm New Password
                    <input
                      className={inputClassName}
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:flex-row sm:items-center">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span>
                    Your current password is verified by the server. Passwords
                    are never returned to the browser.
                  </span>
                </div>
                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {savingPassword ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
