export type CommunicationTemplate = {
  template_key: string;
  name: string;
  short_description: string;
  category: string;
  suggested_channel: string;
  status: "active" | "inactive" | string;
  sort_order: number;
};

export type CommunicationTemplateResponse = {
  data: CommunicationTemplate[];
};

export type CommunicationTemplateErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export type CommunicationTemplateState =
  | "loading_communication_templates"
  | "templates_loaded"
  | "base_templates_only"
  | "denied_or_session_invalid"
  | "server_error";

export const COMMUNICATION_TEMPLATE_ALLOWLIST = [
  "template_key",
  "name",
  "short_description",
  "category",
  "suggested_channel",
  "status",
  "sort_order",
] as const;

export const COMMUNICATION_TEMPLATE_STATES = [
  "loading_communication_templates",
  "templates_loaded",
  "base_templates_only",
  "denied_or_session_invalid",
  "server_error",
] as const;

const BASE_TEMPLATE_KEYS = new Set([
  "visitante_primeiro_contato",
  "atualizacao_cadastro",
  "aviso_semanal",
  "lembrete_evento",
]);

export function normalizeCommunicationTemplateResponse(value: unknown): CommunicationTemplateResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = (value as Record<string, unknown>).data;

  if (!Array.isArray(data)) {
    return null;
  }

  const templates = data.map(normalizeCommunicationTemplate);

  if (templates.some((template) => template === null)) {
    return null;
  }

  return {
    data: templates as CommunicationTemplate[],
  };
}

export function isBaseTemplatesOnly(templates: CommunicationTemplate[]): boolean {
  return templates.length > 0 && templates.every((template) => BASE_TEMPLATE_KEYS.has(template.template_key));
}

export function categoryLabel(category: string): string {
  return {
    visitor_follow_up: "Acolhimento",
    member_update: "Atualizacao de dados",
    weekly_notice: "Aviso da semana",
    event_reminder: "Lembrete de programacao",
  }[category] ?? "Comunicacao";
}

export function suggestedChannelLabel(channel: string): string {
  return channel === "external_handoff" ? "Handoff externo futuro" : "Canal a definir";
}

function normalizeCommunicationTemplate(value: unknown): CommunicationTemplate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const template = value as Record<string, unknown>;

  if (
    typeof template.template_key !== "string"
    || typeof template.name !== "string"
    || typeof template.short_description !== "string"
    || typeof template.category !== "string"
    || typeof template.suggested_channel !== "string"
    || typeof template.status !== "string"
    || typeof template.sort_order !== "number"
  ) {
    return null;
  }

  return {
    template_key: template.template_key,
    name: template.name,
    short_description: template.short_description,
    category: template.category,
    suggested_channel: template.suggested_channel,
    status: template.status,
    sort_order: template.sort_order,
  };
}
