export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  subject_template: string;
  body_template: string;
  attachments_meta: unknown[];
  created_at: string;
  updated_at: string;
}

export interface CreateEmailTemplateRequest {
  name: string;
  subject_template: string;
  body_template: string;
  attachments_meta?: unknown[];
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject_template?: string;
  body_template?: string;
  attachments_meta?: unknown[];
}

export interface PreviewTemplateRequest {
  name?: string;
  subject_template: string;
  body_template: string;
}

export type CampaignScheduleType = 'manual' | 'cron' | 'event';

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  template_id: string;
  schedule_type: CampaignScheduleType;
  schedule_cron: string | null;
  event_type: string | null;
  recipient_query: unknown;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  template_id: string;
  schedule_type?: CampaignScheduleType;
  schedule_cron?: string | null;
  event_type?: string | null;
  recipient_query?: unknown;
  enabled?: boolean;
}

export interface UpdateCampaignRequest {
  name?: string;
  template_id?: string;
  schedule_type?: CampaignScheduleType;
  schedule_cron?: string | null;
  event_type?: string | null;
  recipient_query?: unknown;
  enabled?: boolean;
}

export interface MassEmailLog {
  id: string;
  tenant_id: string;
  campaign_id: string;
  recipient: string;
  status: string;
  sent_at: string;
  created_at: string;
}
