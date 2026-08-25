import type {
  Visitor,
  VisitorFieldErrors,
  VisitorPayload,
  VisitorStatus,
} from "@/features/people/visitor";

export type VisitorFormMode = "create" | "edit";

export type VisitorFormState =
  | "loading_visitor_form"
  | "creating_ready"
  | "editing_loaded"
  | "saving_visitor"
  | "visitor_saved"
  | "validation_error"
  | "denied_or_session_invalid"
  | "not_found"
  | "server_error";

export type VisitorFormValues = {
  display_name: string;
  status: VisitorStatus;
  phone: string;
  email: string;
};

export const EMPTY_VISITOR_FORM_VALUES: VisitorFormValues = {
  display_name: "",
  status: "new",
  phone: "",
  email: "",
};

export function visitorValuesFromVisitor(visitor: Visitor): VisitorFormValues {
  return {
    display_name: visitor.display_name,
    status: visitor.status,
    phone: visitor.phone ?? "",
    email: visitor.email ?? "",
  };
}

export function buildVisitorPayload(values: VisitorFormValues): VisitorPayload {
  return {
    display_name: values.display_name,
    status: values.status,
    phone: values.phone,
    email: values.email,
  };
}

export function firstVisitorErrorField(errors: VisitorFieldErrors): keyof VisitorPayload | null {
  for (const field of ["display_name", "status", "phone", "email"] as const) {
    if (errors[field]) {
      return field;
    }
  }

  return null;
}

export function shouldRenderVisitorForm(
  mode: VisitorFormMode,
  state: VisitorFormState,
  hasLoadedInitialVisitor: boolean,
): boolean {
  if (state === "denied_or_session_invalid" || state === "not_found") {
    return false;
  }

  if (mode === "edit" && state === "server_error" && !hasLoadedInitialVisitor) {
    return false;
  }

  return true;
}
