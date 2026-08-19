export type MemberStatus = "active" | "inactive" | "needs_update";

export type Member = {
  id: number;
  display_name: string;
  status: MemberStatus;
  phone: string | null;
  email: string | null;
};

export type MemberPayload = {
  display_name: string;
  status: MemberStatus;
  phone?: string | null;
  email?: string | null;
};

export type MemberResponse = {
  data: {
    member: Member;
  };
  message?: string;
};

export type MemberErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export const MEMBER_PAYLOAD_ALLOWLIST = [
  "display_name",
  "status",
  "phone",
  "email",
] as const;

export const MEMBER_FORM_STATUS_OPTIONS: Array<{
  value: MemberStatus;
  label: string;
}> = [
  { value: "active", label: "Ativo" },
  { value: "needs_update", label: "Precisa de atualizacao" },
  { value: "inactive", label: "Inativo" },
];

export type MemberFieldErrors = Partial<Record<keyof MemberPayload, string>>;

export function readMember(value: unknown): Member | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const response = value as Record<string, unknown>;
  const data = response.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const member = (data as Record<string, unknown>).member;

  if (!member || typeof member !== "object" || Array.isArray(member)) {
    return null;
  }

  const record = member as Record<string, unknown>;
  const status = record.status;

  if (
    typeof record.id !== "number"
    || typeof record.display_name !== "string"
    || (status !== "active" && status !== "inactive" && status !== "needs_update")
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

export function extractMemberValidationErrors(value: unknown): MemberFieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const errors = (value as Record<string, unknown>).errors;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  const fieldErrors: MemberFieldErrors = {};

  for (const field of MEMBER_PAYLOAD_ALLOWLIST) {
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
