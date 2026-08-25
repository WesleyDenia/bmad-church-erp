export type VisitorStatus = "new" | "follow_up_needed" | "contacted" | "inactive";

export type Visitor = {
  id: number;
  display_name: string;
  status: VisitorStatus;
  phone: string | null;
  email: string | null;
};

export type VisitorPayload = {
  display_name: string;
  status: VisitorStatus;
  phone?: string | null;
  email?: string | null;
};

export type VisitorResponse = {
  data: {
    visitor: Visitor;
  };
  message?: string;
};

export type VisitorErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export const VISITOR_PAYLOAD_ALLOWLIST = [
  "display_name",
  "status",
  "phone",
  "email",
] as const;

export const VISITOR_FORM_STATUS_OPTIONS: Array<{
  value: VisitorStatus;
  label: string;
}> = [
  { value: "new", label: "Novo" },
  { value: "follow_up_needed", label: "Precisa de acompanhamento" },
  { value: "contacted", label: "Contatado" },
  { value: "inactive", label: "Inativo" },
];

export type VisitorFieldErrors = Partial<Record<keyof VisitorPayload, string>>;

export function readVisitor(value: unknown): Visitor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const response = value as Record<string, unknown>;
  const data = response.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const visitor = (data as Record<string, unknown>).visitor;

  if (!visitor || typeof visitor !== "object" || Array.isArray(visitor)) {
    return null;
  }

  const record = visitor as Record<string, unknown>;
  const status = record.status;

  if (
    typeof record.id !== "number"
    || typeof record.display_name !== "string"
    || (status !== "new" && status !== "follow_up_needed" && status !== "contacted" && status !== "inactive")
    || !(typeof record.phone === "string" || record.phone === null)
    || !(typeof record.email === "string" || record.email === null)
  ) {
    return null;
  }

  return {
    id: record.id,
    display_name: record.display_name,
    status,
    phone: record.phone,
    email: record.email,
  };
}

export function extractVisitorValidationErrors(value: unknown): VisitorFieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const errors = (value as Record<string, unknown>).errors;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  const fieldErrors: VisitorFieldErrors = {};

  for (const field of VISITOR_PAYLOAD_ALLOWLIST) {
    const messages = (errors as Record<string, unknown>)[field];

    if (
      Array.isArray(messages)
      && messages.length > 0
      && typeof messages[0] === "string"
    ) {
      fieldErrors[field] = messages[0];
    }
  }

  return fieldErrors;
}
