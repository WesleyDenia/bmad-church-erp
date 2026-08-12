export type SecretaryHomeState =
  | "loading_secretary_home"
  | "secretary_home_loaded"
  | "empty_secretary_home"
  | "denied_or_session_invalid"
  | "server_error"
  | "technical_recovered_without_pii";

export type PeoplePendingItemsState =
  | "people_pending_items_loaded"
  | "empty_people_pending_items";

export type RecentVisitorsState =
  | "recent_visitors_loaded"
  | "empty_recent_visitors";

export type SecretaryPersonPreview = {
  display_name: string;
  status: string;
  contact_summary: string | null;
};

export type PeoplePendingItem = {
  category: string;
  label: string;
  count: number;
  next_step_label: string;
  href: string;
  people_preview: SecretaryPersonPreview[];
};

export type PeoplePendingItemsBlock = {
  state: PeoplePendingItemsState;
  total_count: number;
  items: PeoplePendingItem[];
};

export type RecentVisitorItem = SecretaryPersonPreview & {
  next_step_label: string;
  href: string;
};

export type RecentVisitorsBlock = {
  state: RecentVisitorsState;
  window_days: 30;
  limit: 5;
  items: RecentVisitorItem[];
};

export type SecretaryQuickAction = {
  label: string;
  href: string;
  state: "available" | "preparing_flow";
};

export type UnavailableSecretaryBlock = {
  state: "event_schedule_unavailable" | "communication_pending_unavailable";
  summary: string;
  next_step_label: null;
  items: [];
};

export type WeeklyChecklistItem = {
  key: string;
  label: string;
  state: "not_started";
};

export type WeeklyChecklistBlock = {
  state: "weekly_checklist_ready";
  items: WeeklyChecklistItem[];
};

export type SecretaryHome = {
  state: "secretary_home_loaded" | "empty_secretary_home";
  people_pending_items: PeoplePendingItemsBlock;
  recent_visitors: RecentVisitorsBlock;
  quick_actions: SecretaryQuickAction[];
  event_schedule: UnavailableSecretaryBlock;
  communication_pending: UnavailableSecretaryBlock;
  weekly_checklist: WeeklyChecklistBlock;
};

export type SecretaryHomeResponse = {
  data: {
    secretary_home: SecretaryHome;
  };
};

export type SecretaryHomeErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export const SECRETARY_HOME_PERSON_ALLOWLIST = [
  "display_name",
  "status",
  "contact_summary",
  "next_step_label",
  "href",
] as const;

export function readSecretaryHome(value: unknown): SecretaryHome | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const response = value as Record<string, unknown>;
  const data = response.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const home = (data as Record<string, unknown>).secretary_home;

  if (!home || typeof home !== "object" || Array.isArray(home)) {
    return null;
  }

  return home as SecretaryHome;
}
