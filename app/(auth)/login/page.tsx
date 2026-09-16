import type { Metadata } from "next";
import { LoginButton } from "./login-button";

export const metadata: Metadata = {
  title: "Sign In — SIF Sentinel",
};

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm shadow-2xl">
      <h2 className="mb-2 text-2xl font-bold text-white text-center">
        Welcome back
      </h2>
      <p className="mb-8 text-center text-sm text-slate-400">
        Sign in to your organisation&apos;s SIF Sentinel workspace
      </p>

      <LoginButton />

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs text-amber-400 leading-relaxed">
          <strong>First time here?</strong> You must be invited by your
          manager or HSE administrator before you can access the platform. If
          you&apos;re setting up a new company,{" "}
          <a href="/register-company" className="underline hover:text-amber-300">
            register here
          </a>
          .
        </p>
      </div>
    </div>
  );
}
