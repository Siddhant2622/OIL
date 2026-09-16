import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Building2, UserX } from "lucide-react";

export const metadata: Metadata = {
  title: "Not Registered — SIF Sentinel",
};

interface Props {
  searchParams: Promise<{ email?: string; org_hint?: string }>;
}

export default async function NotRegisteredPage({ searchParams }: Props) {
  const { email, org_hint } = await searchParams;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <UserX className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">You are not registered</h2>
        <p className="mt-2 text-sm text-slate-400">
          This Google account{" "}
          {email && (
            <span className="font-mono text-slate-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">
              {email}
            </span>
          )}{" "}
          is not linked to any company on SIF Sentinel.
        </p>
      </div>

      {/* Domain hint */}
      {org_hint && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-300">
            Your company <strong>{org_hint}</strong> already uses SIF Sentinel.
            Ask your HSE administrator or manager to invite this exact email
            address.
          </p>
        </div>
      )}

      {/* Two cards */}
      <div className="grid gap-4">
        {/* Card 1: Register new company */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/15">
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white">
              Register a new company
            </h3>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            You&apos;ll become the Company Admin (ORG_ADMIN) and can then
            invite your entire team.
          </p>
          <Link
            href="/register-company"
            className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
            id="register-company-btn"
          >
            Register your company →
          </Link>
        </div>

        {/* Card 2: Join existing company */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-600/15">
              <AlertCircle className="h-4 w-4 text-slate-400" />
            </div>
            <h3 className="font-semibold text-white">
              Join an existing company
            </h3>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Ask your manager or HSE administrator to invite{" "}
            <strong className="text-white">{email ?? "your Google email"}</strong>{" "}
            to the platform. Once invited, sign in again with the same Google
            account.
          </p>
          <div className="rounded-lg bg-white/5 border border-white/5 p-3 text-xs text-slate-500">
            Invitations are sent by email and expire after 14 days.
          </div>

          {/* Sign out and try another account */}
          <form
            action="/api/auth/signout"
            method="POST"
            className="mt-4"
          >
            <button
              type="submit"
              className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Sign out and try another account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
