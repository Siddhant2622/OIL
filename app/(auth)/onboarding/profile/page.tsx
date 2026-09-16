"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  designation: z.string().min(1, "Designation is required"),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingProfilePage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch("/api/profile/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push("/dashboard");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
      <h2 className="mb-1 text-2xl font-bold text-white">Complete your profile</h2>
      <p className="mb-6 text-sm text-slate-400">
        Tell us a little about yourself before entering the platform.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Full name <span className="text-red-400">*</span>
          </label>
          <input
            {...register("full_name")}
            placeholder="e.g. Rajesh Kumar"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-400">{errors.full_name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Designation / Job title <span className="text-red-400">*</span>
          </label>
          <input
            {...register("designation")}
            placeholder="e.g. HSE Officer"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.designation && (
            <p className="mt-1 text-xs text-red-400">{errors.designation.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Phone number (optional)
          </label>
          <input
            {...register("phone")}
            type="tel"
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          id="complete-profile-btn"
        >
          {isSubmitting ? "Saving…" : "Enter the platform →"}
        </button>
      </form>
    </div>
  );
}
