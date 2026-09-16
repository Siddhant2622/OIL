"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { User, Save } from "lucide-react";

const schema = z.object({
  full_name: z.string().min(2, "Name required"),
  designation: z.string().optional(),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProfileSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? "");

      const res = await fetch("/api/profile/me");
      if (res.ok) {
        const data = await res.json();
        reset({
          full_name: data.full_name ?? "",
          designation: data.designation ?? "",
          phone: data.phone ?? "",
        });
      }
    }
    load();
  }, [reset]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/profile/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">{userEmail}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Full name</label>
          <input {...register("full_name")} className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Designation</label>
          <input {...register("designation")} className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Phone</label>
          <input {...register("phone")} type="tel" className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <p className="text-sm text-green-600">✓ Saved</p>}
        </div>
      </form>
    </div>
  );
}
