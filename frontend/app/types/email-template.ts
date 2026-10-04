export type EmailTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface EmailTemplateSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  currentVersion: {
    id: string;
    version: number;
    subject: string;
    status: EmailTemplateStatus;
    publishedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variablesSchema: {
    type: "object";
    properties: Record<string, { type: "string" | "number"; description?: string }>;
    required: string[];
  };
  status: EmailTemplateStatus;
  changeNote: string | null;
  createdByUserId: number;
  createdAt: string;
  publishedAt: string | null;
  publishedByUserId: number | null;
}

export interface EmailTemplateDetail extends EmailTemplateSummary {
  versions: EmailTemplateVersion[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  usedVariables: string[];
}

export interface CreateVersionPayload {
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variablesSchema: EmailTemplateVersion["variablesSchema"];
  changeNote?: string;
}

export interface UpdateVersionPayload {
  subject?: string;
  htmlTemplate?: string;
  textTemplate?: string;
  variablesSchema?: EmailTemplateVersion["variablesSchema"];
  changeNote?: string;
}
