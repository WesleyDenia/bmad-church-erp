export type CommunicationMessageDraftPayload = {
  template_key: string;
  person_type: "member" | "visitor";
  person_id: number;
};

export type CommunicationMessageDraftMissingField = {
  field: "contact" | "unknown_placeholder" | "profile_needs_update" | string;
  label: string;
  message: string;
  placeholder?: string;
};

export type CommunicationMessageDraftResponse = {
  data: {
    template: {
      template_key: string;
      name: string;
      category: string;
      suggested_channel: string;
    };
    person: {
      id: number;
      person_type: "member" | "visitor";
      display_name: string;
      status: string;
      status_label: string;
      contact_summary: string;
    };
    draft: {
      message_body: string;
      missing_fields: CommunicationMessageDraftMissingField[];
      used_fields: string[];
      editable: true;
    };
  };
};

export type CommunicationMessageDraftErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export type CommunicationMessageDraftState =
  | "loading_people_for_message"
  | "ready_to_prepare_message"
  | "communication_context_loaded"
  | "communication_context_invalid"
  | "generating_message_draft"
  | "message_draft_ready"
  | "draft_has_missing_contact"
  | "validation_error"
  | "denied_or_session_invalid"
  | "server_error";

export const COMMUNICATION_MESSAGE_DRAFT_PAYLOAD_ALLOWLIST = [
  "template_key",
  "person_type",
  "person_id",
] as const;

export const COMMUNICATION_MESSAGE_DRAFT_RESPONSE_ALLOWLIST = [
  "template",
  "person",
  "draft",
] as const;

export const COMMUNICATION_MESSAGE_DRAFT_STATES = [
  "loading_people_for_message",
  "ready_to_prepare_message",
  "communication_context_loaded",
  "communication_context_invalid",
  "generating_message_draft",
  "message_draft_ready",
  "draft_has_missing_contact",
  "validation_error",
  "denied_or_session_invalid",
  "server_error",
] as const;

export type SecretaryHomeCommunicationContext = {
  template_key: string;
  person_type: "member" | "visitor";
  person_id: number;
  source: "secretary_home";
};

export type SecretaryHomeCommunicationContextParseResult = {
  state: "communication_context_loaded" | "communication_context_invalid" | null;
  context: SecretaryHomeCommunicationContext | null;
};

const CONTEXT_FIELDS = ["template_key", "person_type", "person_id", "source"] as const;

export function parseSecretaryHomeCommunicationContext(searchParams: URLSearchParams): SecretaryHomeCommunicationContextParseResult {
  const keys = [...searchParams.keys()];

  if (keys.length === 0) {
    return {
      state: null,
      context: null,
    };
  }

  const hasOnlyAllowedFields = keys.every((key) => CONTEXT_FIELDS.includes(key as (typeof CONTEXT_FIELDS)[number]));
  const templateKey = searchParams.get("template_key");
  const personType = searchParams.get("person_type");
  const personId = Number(searchParams.get("person_id"));
  const source = searchParams.get("source");

  if (
    keys.length !== CONTEXT_FIELDS.length
    || !hasOnlyAllowedFields
    || typeof templateKey !== "string"
    || !/^[a-z0-9_:-]{1,80}$/.test(templateKey)
    || (personType !== "member" && personType !== "visitor")
    || !Number.isSafeInteger(personId)
    || personId < 1
    || source !== "secretary_home"
  ) {
    return {
      state: "communication_context_invalid",
      context: null,
    };
  }

  return {
    state: "communication_context_loaded",
    context: {
      template_key: templateKey,
      person_type: personType,
      person_id: personId,
      source,
    },
  };
}

export function normalizeCommunicationMessageDraftResponse(value: unknown): CommunicationMessageDraftResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = (value as Record<string, unknown>).data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const template = normalizeTemplate(record.template);
  const person = normalizePerson(record.person);
  const draft = normalizeDraft(record.draft);

  if (!template || !person || !draft) {
    return null;
  }

  return {
    data: {
      template,
      person,
      draft,
    },
  };
}

export function hasMissingContact(response: CommunicationMessageDraftResponse): boolean {
  return response.data.draft.missing_fields.some((field) => field.field === "contact");
}

function normalizeTemplate(value: unknown): CommunicationMessageDraftResponse["data"]["template"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const template = value as Record<string, unknown>;

  if (
    typeof template.template_key !== "string"
    || typeof template.name !== "string"
    || typeof template.category !== "string"
    || typeof template.suggested_channel !== "string"
  ) {
    return null;
  }

  return {
    template_key: template.template_key,
    name: template.name,
    category: template.category,
    suggested_channel: template.suggested_channel,
  };
}

function normalizePerson(value: unknown): CommunicationMessageDraftResponse["data"]["person"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const person = value as Record<string, unknown>;

  if (
    typeof person.id !== "number"
    || (person.person_type !== "member" && person.person_type !== "visitor")
    || typeof person.display_name !== "string"
    || typeof person.status !== "string"
    || typeof person.status_label !== "string"
    || typeof person.contact_summary !== "string"
  ) {
    return null;
  }

  return {
    id: person.id,
    person_type: person.person_type,
    display_name: person.display_name,
    status: person.status,
    status_label: person.status_label,
    contact_summary: person.contact_summary,
  };
}

function normalizeDraft(value: unknown): CommunicationMessageDraftResponse["data"]["draft"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const draft = value as Record<string, unknown>;

  if (
    typeof draft.message_body !== "string"
    || !Array.isArray(draft.missing_fields)
    || !Array.isArray(draft.used_fields)
    || draft.editable !== true
  ) {
    return null;
  }

  const missingFields = draft.missing_fields.map(normalizeMissingField);

  if (missingFields.some((field) => field === null) || draft.used_fields.some((field) => typeof field !== "string")) {
    return null;
  }

  return {
    message_body: draft.message_body,
    missing_fields: missingFields as CommunicationMessageDraftMissingField[],
    used_fields: draft.used_fields as string[],
    editable: true,
  };
}

function normalizeMissingField(value: unknown): CommunicationMessageDraftMissingField | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const field = value as Record<string, unknown>;

  if (
    typeof field.field !== "string"
    || typeof field.label !== "string"
    || typeof field.message !== "string"
    || (field.placeholder !== undefined && typeof field.placeholder !== "string")
  ) {
    return null;
  }

  return {
    field: field.field,
    label: field.label,
    message: field.message,
    ...(field.placeholder === undefined ? {} : { placeholder: field.placeholder }),
  };
}
