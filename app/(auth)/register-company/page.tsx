"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Building2, Globe, Briefcase } from "lucide-react";

const schema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  industry: z.string().min(1, "Industry is required"),
  country: z.string().min(1, "Country is required"),
  domain: z
    .string()
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Enter a valid domain (e.g. oilindia.in)")
    .optional()
    .or(z.literal("")),
  admin_designation: z.string().min(1, "Your designation is required"),
});

type FormData = z.infer<typeof schema>;

const INDUSTRIES = [
  "Oil & Gas - Upstream",
  "Oil & Gas - Downstream",
  "Oil & Gas - Midstream",
  "Petroleum Refining",
  "Petrochemicals",
  "Coal Mining",
  "Metal Mining",
  "Construction",
  "Manufacturing",
  "Logistics & Transportation",
  "Power & Utilities",
  "Chemicals",
  "Other",
];

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/company/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      setError("company_name", {
        message: json.error ?? "Registration failed. Please try again.",
      });
      return;
    }

    startTransition(() => {
      router.push("/dashboard/admin");
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15">
          <Building2 className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Register your company</h2>
          <p className="text-sm text-slate-400">
            You&apos;ll become the Company Admin
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Company name <span className="text-red-400">*</span>
          </label>
          <input
            {...register("company_name")}
            placeholder="e.g. Oil India Limited"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.company_name && (
            <p className="mt-1 text-xs text-red-400">
              {errors.company_name.message}
            </p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Industry <span className="text-red-400">*</span>
          </label>
          <select
            {...register("industry")}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {errors.industry && (
            <p className="mt-1 text-xs text-red-400">{errors.industry.message}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Country <span className="text-red-400">*</span>
          </label>
          <input
            {...register("country")}
            placeholder="e.g. India"
            defaultValue="India"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.country && (
            <p className="mt-1 text-xs text-red-400">{errors.country.message}</p>
          )}
        </div>

        {/* Domain (optional) */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            Company email domain{" "}
            <span className="text-slate-600 font-normal">(optional)</span>
          </label>
          <input
            {...register("domain")}
            placeholder="e.g. oilindia.in"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-600">
            Used to detect duplicate registrations from the same company.
          </p>
          {errors.domain && (
            <p className="mt-1 text-xs text-red-400">{errors.domain.message}</p>
          )}
        </div>

        {/* Admin designation */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300">
            <Briefcase className="h-3.5 w-3.5 text-slate-500" />
            Your designation <span className="text-red-400">*</span>
          </label>
          <input
            {...register("admin_designation")}
            placeholder="e.g. Head of HSE / CEO / Safety Director"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.admin_designation && (
            <p className="mt-1 text-xs text-red-400">
              {errors.admin_designation.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isPending}
          className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          id="register-company-submit"
        >
          {isSubmitting || isPending
            ? "Creating your workspace…"
            : "Create company workspace →"}
        </button>
      </form>
    </div>
  );
}
