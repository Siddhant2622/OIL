/**
 * Database type definitions matching the Supabase schema.
 * Generated manually to match supabase/migrations/0001_init.sql.
 * Regenerate with: npx supabase gen types typescript --local > types/database.ts
 */

export type UserRole =
  | "ORG_ADMIN"
  | "HSE_MANAGER"
  | "DEPT_HEAD"
  | "SUPERVISOR"
  | "EMPLOYEE";

export type ReportType =
  | "UNSAFE_ACT"
  | "UNSAFE_CONDITION"
  | "NEAR_MISS"
  | "INCIDENT";

export type ReportStatus =
  | "SUBMITTED"
  | "ANALYZING"
  | "ANALYZED"
  | "ANALYSIS_FAILED"
  | "IN_REVIEW"
  | "CONFIRMED_SIF"
  | "CONFIRMED_NON_SIF"
  | "ACTIONS_OPEN"
  | "CLOSED";

export type RiskBand = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ActionStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "OVERDUE";

export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          industry: string;
          country: string;
          settings: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          industry?: string;
          country?: string;
          settings?: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      sites: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          site_type: string | null;
          region: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          site_type?: string | null;
          region?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sites"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          manager_id: string | null;
          designation: string | null;
          department: string | null;
          site_id: string | null;
          phone: string | null;
          whatsapp_verified?: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          manager_id?: string | null;
          designation?: string | null;
          department?: string | null;
          site_id?: string | null;
          phone?: string | null;
          whatsapp_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: UserRole;
          manager_id: string | null;
          site_id: string | null;
          department: string | null;
          invited_by: string | null;
          status: InviteStatus;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role: UserRole;
          manager_id?: string | null;
          site_id?: string | null;
          department?: string | null;
          invited_by?: string | null;
          status?: InviteStatus;
          expires_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
      };
      reports: {
        Row: {
          id: string;
          org_id: string;
          report_code: string;
          reporter_id: string;
          site_id: string | null;
          report_type: ReportType;
          occurred_at: string;
          location_text: string | null;
          activity_text: string | null;
          description: string;
          immediate_action: string | null;
          reported_severity: string | null;
          contractor: string | null;
          shift: string | null;
          source: string;
          attachments: AttachmentMeta[];
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          report_code: string;
          reporter_id: string;
          site_id?: string | null;
          report_type: ReportType;
          occurred_at: string;
          location_text?: string | null;
          activity_text?: string | null;
          description: string;
          immediate_action?: string | null;
          reported_severity?: string | null;
          contractor?: string | null;
          shift?: string | null;
          source?: string;
          attachments?: AttachmentMeta[];
          status?: ReportStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
      };
      ai_analyses: {
        Row: {
          id: string;
          org_id: string;
          report_id: string;
          model: string;
          prompt_version: string;
          sif_potential: boolean;
          sif_confidence: number;
          risk_band: RiskBand;
          energy_source: string | null;
          hazard: string | null;
          activity: string | null;
          location_type: string | null;
          equipment: string | null;
          barriers: BarrierItem[];
          lsr_tags: string[];
          precursor_type: string | null;
          evidence_spans: string[];
          rationale: string | null;
          recommended_actions: RecommendedAction[];
          needs_human_review: boolean;
          review_reasons: string[];
          rule_overrides: RuleOverride[];
          latency_ms: number | null;
          raw_response: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["ai_analyses"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["ai_analyses"]["Insert"]>;
      };
      report_embeddings: {
        Row: {
          report_id: string;
          org_id: string;
          embedding: number[];
        };
        Insert: {
          report_id: string;
          org_id: string;
          embedding: number[];
        };
        Update: Partial<Database["public"]["Tables"]["report_embeddings"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          org_id: string;
          report_id: string;
          reviewer_id: string;
          agreed: boolean;
          final_sif: boolean;
          final_band: RiskBand;
          final_lsr_tags: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          report_id: string;
          reviewer_id: string;
          agreed: boolean;
          final_sif: boolean;
          final_band: RiskBand;
          final_lsr_tags?: string[];
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      actions: {
        Row: {
          id: string;
          org_id: string;
          report_id: string | null;
          title: string;
          description: string | null;
          assigned_to: string | null;
          created_by: string | null;
          due_date: string | null;
          priority: string;
          status: ActionStatus;
          completed_at: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          report_id?: string | null;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          due_date?: string | null;
          priority?: string;
          status?: ActionStatus;
          completed_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["actions"]["Insert"]>;
      };
      clusters: {
        Row: {
          id: string;
          org_id: string;
          key_type: string;
          key_value: string;
          report_count: number;
          sif_count: number;
          density: number;
          wilson_lb: number;
          window_days: number;
          is_alerting: boolean;
          computed_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          key_type: string;
          key_value: string;
          report_count: number;
          sif_count: number;
          density: number;
          wilson_lb: number;
          window_days?: number;
          is_alerting?: boolean;
          computed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clusters"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: string;
          org_id: string | null;
          actor_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          meta: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          meta?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
      };
    };
    Functions: {
      current_org_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      current_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_org_wide: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      subordinate_ids: {
        Args: { root: string };
        Returns: { id: string }[];
      };
    };
    Enums: {
      user_role: UserRole;
      report_type: ReportType;
      report_status: ReportStatus;
      risk_band: RiskBand;
      action_status: ActionStatus;
      invite_status: InviteStatus;
    };
  };
}

// ── Structured sub-types ──────────────────────────────────────────────────────

export interface BarrierItem {
  name: string;
  status: "PRESENT" | "MISSING" | "FAILED" | "BYPASSED";
}

export interface RecommendedAction {
  title: string;
  owner_role: string;
  urgency: "IMMEDIATE" | "SHORT_TERM" | "SYSTEMIC";
}

export interface RuleOverride {
  rule: string;
  triggered: boolean;
  original_band?: RiskBand;
  forced_band?: RiskBand;
  reason: string;
}

export interface AttachmentMeta {
  path: string;
  name: string;
  size: number;
  mime: string;
}

export interface ExposureInfo {
  person_exposed: boolean;
  description: string;
}

// ── Convenience row types ─────────────────────────────────────────────────────
export type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];
export type SiteRow = Database["public"]["Tables"]["sites"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type AnalysisRow = Database["public"]["Tables"]["ai_analyses"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type ActionRow = Database["public"]["Tables"]["actions"]["Row"];
export type ClusterRow = Database["public"]["Tables"]["clusters"]["Row"];
export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];
