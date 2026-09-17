"use client";

import { useState } from "react";
import { X, UserPlus, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface ManagerOption {
  id: string;
  name: string;
  role: string;
  designation?: string | null;
}

interface SiteOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultManagerId?: string | null;
  managers: ManagerOption[];
  sites: SiteOption[];
}

const COMMON_POSITIONS = [
  "Company Head",
  "Operations Head",
  "Maintenance Head",
  "Drilling Head",
  "HSE Head",
  "Area Manager",
  "Shift Supervisor",
  "HSE Officer",
  "Senior Operator",
  "Lead Technician",
  "Field Operator",
  "Contract Technician",
];

const DEPARTMENTS = [
  "Operations",
  "Maintenance",
  "Drilling",
  "HSE & Fire Safety",
  "Production",
  "Pipeline",
  "Electrical & Instrumentation",
  "Logistics",
];

export function InviteModal({
  open,
  onClose,
  onSuccess,
  defaultManagerId,
  managers,
  sites,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [designation, setDesignation] = useState("Field Operator");
  const [department, setDepartment] = useState("Operations");
  const [managerId, setManagerId] = useState(defaultManagerId ?? "");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          designation,
          department,
          manager_id: managerId ? managerId : null,
          site_id: siteId ? siteId : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to send invitation");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1400);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Invite Team Member</h2>
            <p className="text-xs text-muted-foreground">
              Add a head, supervisor, or field personnel to your organization tree.
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto animate-bounce" />
            <p className="font-bold text-foreground">Invitation Sent!</p>
            <p className="text-xs text-muted-foreground">
              {email} will automatically join the hierarchy when signing in with Google.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Work Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. j.sharma@oilindia.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Position vs Role Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Organizational Position
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {COMMON_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Access Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="EMPLOYEE">Employee (Reporter)</option>
                  <option value="SUPERVISOR">Supervisor (Field Lead)</option>
                  <option value="DEPT_HEAD">Department Head</option>
                  <option value="HSE_MANAGER">HSE Manager</option>
                  <option value="ORG_ADMIN">Company Admin</option>
                </select>
              </div>
            </div>

            {/* Department & Site */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Primary Site
                </label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Organization Wide</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reports to / Manager */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Reports Directly To (Hierarchy Head)
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">No Direct Manager (Top Level Head)</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.designation || m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>
                Zero manual passwords. When the recipient logs in with Google, SIF Sentinel matches their email, links them to the reporting chain, and assigns their dashboard.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Invite…
                  </>
                ) : (
                  "Send Invitation →"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
