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
        {/* Card 1: Join existing company (Primary for employees) */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Joining an existing organization?
              </h3>
              <p className="text-xs text-blue-300/80">For field operators, supervisors, department heads & HSE personnel</p>
            </div>
          </div>
          <p className="mb-3 text-sm text-slate-300 leading-relaxed">
            To access your team workspace, your organization administrator or supervisor must send an invitation to this exact Google email address:
          </p>
          <div className="rounded-xl bg-slate-900/80 border border-white/10 p-3 mb-4 flex items-center justify-between">
            <span className="font-mono text-xs text-amber-300 font-semibold truncate">
              {email ?? "your Google account email"}
            </span>
            <span className="text-[11px] text-slate-500 shrink-0 ml-2">Must match invitation</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            If your administrator sent the invite to a different Google account (e.g. personal vs corporate Gmail), sign out and select that account:
          </p>

          {/* Sign out and try another account */}
          <form
            action="/api/auth/signout"
            method="POST"
          >
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 shadow-sm"
              id="switch-account-btn"
            >
              Sign out & try another Google account →
            </button>
          </form>
        </div>

        {/* Card 2: Register new company (Only for company founders/admins) */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                Setting up a new company workspace?
              </h3>
              <p className="text-xs text-slate-500">Only if you are creating a new company organization</p>
            </div>
          </div>
          <p className="mb-4 text-xs text-slate-400 leading-relaxed">
            If you are the designated Company Administrator registering a new company from scratch, proceed below to configure your company workspace and become <span className="text-slate-300 font-mono">ORG_ADMIN</span>.
          </p>
          <Link
            href="/register-company"
            className="block w-full rounded-xl border border-white/10 px-4 py-2.5 text-center text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            id="register-company-btn"
          >
            Register new company workspace →
          </Link>
        </div>
      </div>
    </div>
  );
}
