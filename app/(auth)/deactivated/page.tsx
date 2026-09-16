import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";

export const metadata: Metadata = { title: "Account Deactivated — SIF Sentinel" };

export default function DeactivatedPage() {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
        <ShieldX className="h-7 w-7 text-red-400" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-white">Access Disabled</h2>
      <p className="mb-6 text-sm text-slate-400 leading-relaxed">
        Your access has been disabled by your administrator.
        <br />
        Contact your HSE manager or company admin to re-enable access.
      </p>
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
