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

export type CommunicationPendingState =
  | "communication_pending_loaded"
  | "empty_communication_pending"
  | "blocked_missing_contact";

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
  state: "event_schedule_unavailable";
  summary: string;
  next_step_label: null;
  items: [];
};

export type CommunicationPendingPersonPreview = {
  person_id: number;
  person_type: "member" | "visitor";
  display_name: string;
  status: string;
  status_label: string;
  contact_summary: string;
};

export type ReadyCommunicationPendingItem = {
  category: "visitor_follow_up_ready" | "member_update_ready";
  label: string;
  count: number;
  next_step_label: string;
  template_key: string;
  href: string;
  people_preview: CommunicationPendingPersonPreview[];
};

export type MissingContactCommunicationPendingItem = {
  category: "missing_contact_for_communication";
  label: string;
  count: number;
  next_step_label: string;
  template_key: null;
  href: string;
  people_preview: CommunicationPendingPersonPreview[];
};

export type MissingTemplateCommunicationPendingItem = {
  category: "missing_template_for_communication";
  label: string;
  count: number;
  next_step_label: string;
  template_key: string;
  href: "/communications";
  people_preview: [];
};

export type CommunicationPendingItem =
  | ReadyCommunicationPendingItem
  | MissingContactCommunicationPendingItem
  | MissingTemplateCommunicationPendingItem;

export type CommunicationPendingBlock = {
  state: CommunicationPendingState;
  summary: string;
  total_count: number;
  items: CommunicationPendingItem[];
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
  communication_pending: CommunicationPendingBlock;
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

export const COMMUNICATION_PENDING_PERSON_ALLOWLIST = [
  "person_id",
  "person_type",
  "display_name",
  "status",
  "status_label",
  "contact_summary",
] as const;

const EMPTY_PEOPLE_PENDING_ITEMS: PeoplePendingItemsBlock = {
  state: "empty_people_pending_items",
  total_count: 0,
  items: [],
};

const EMPTY_RECENT_VISITORS: RecentVisitorsBlock = {
  state: "empty_recent_visitors",
  window_days: 30,
  limit: 5,
  items: [],
};

const EMPTY_EVENT_SCHEDULE: UnavailableSecretaryBlock = {
  state: "event_schedule_unavailable",
  summary: "",
  next_step_label: null,
  items: [],
};

const EMPTY_COMMUNICATION_PENDING: CommunicationPendingBlock = {
  state: "empty_communication_pending",
  summary: "Nao ha comunicacao pendente agora.",
  total_count: 0,
  items: [],
};

const EMPTY_WEEKLY_CHECKLIST: WeeklyChecklistBlock = {
  state: "weekly_checklist_ready",
  items: [],
};

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

  return normalizeSecretaryHome(home as Record<string, unknown>);
}

function normalizeSecretaryHome(home: Record<string, unknown>): SecretaryHome | null {
  const state = normalizeHomeState(home.state);

  if (!state) {
    return null;
  }

  return {
    state,
    people_pending_items: normalizePeoplePendingItemsBlock(home.people_pending_items) ?? EMPTY_PEOPLE_PENDING_ITEMS,
    recent_visitors: normalizeRecentVisitorsBlock(home.recent_visitors) ?? EMPTY_RECENT_VISITORS,
    quick_actions: normalizeQuickActions(home.quick_actions),
    event_schedule: normalizeEventScheduleBlock(home.event_schedule) ?? EMPTY_EVENT_SCHEDULE,
    communication_pending: normalizeCommunicationPendingBlock(home.communication_pending) ?? EMPTY_COMMUNICATION_PENDING,
    weekly_checklist: normalizeWeeklyChecklistBlock(home.weekly_checklist) ?? EMPTY_WEEKLY_CHECKLIST,
  };
}

function normalizeHomeState(value: unknown): SecretaryHome["state"] | null {
  return value === "secretary_home_loaded" || value === "empty_secretary_home" ? value : null;
}

function normalizePeoplePendingItemsBlock(value: unknown): PeoplePendingItemsBlock | null {
  if (!isRecord(value) || !isPeoplePendingItemsState(value.state)) {
    return null;
  }

  return {
    state: value.state,
    total_count: normalizeCount(value.total_count),
    items: normalizeArray(value.items, normalizePeoplePendingItem),
  };
}

function normalizePeoplePendingItem(value: unknown): PeoplePendingItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const category = stringValue(value.category);
  const label = stringValue(value.label);
  const nextStepLabel = stringValue(value.next_step_label);
  const href = stringValue(value.href);

  if (!category || !label || !nextStepLabel || !href) {
    return null;
  }

  return {
    category,
    label,
    count: normalizeCount(value.count),
    next_step_label: nextStepLabel,
    href,
    people_preview: normalizeArray(value.people_preview, normalizeSecretaryPersonPreview),
  };
}

function normalizeRecentVisitorsBlock(value: unknown): RecentVisitorsBlock | null {
  if (!isRecord(value) || !isRecentVisitorsState(value.state)) {
    return null;
  }

  return {
    state: value.state,
    window_days: 30,
    limit: 5,
    items: normalizeArray(value.items, normalizeRecentVisitorItem),
  };
}

function normalizeRecentVisitorItem(value: unknown): RecentVisitorItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const person = normalizeSecretaryPersonPreview(value);
  const nextStepLabel = stringValue(value.next_step_label);
  const href = stringValue(value.href);

  if (!person || !nextStepLabel || !href) {
    return null;
  }

  return {
    ...person,
    next_step_label: nextStepLabel,
    href,
  };
}

function normalizeSecretaryPersonPreview(value: unknown): SecretaryPersonPreview | null {
  if (!isRecord(value)) {
    return null;
  }

  const displayName = stringValue(value.display_name);
  const status = stringValue(value.status);
  const contactSummary = value.contact_summary === null ? null : stringValue(value.contact_summary);

  if (!displayName || !status || contactSummary === undefined) {
    return null;
  }

  return {
    display_name: displayName,
    status,
    contact_summary: contactSummary,
  };
}

function normalizeQuickActions(value: unknown): SecretaryQuickAction[] {
  return normalizeArray(value, (item) => {
    if (!isRecord(item)) {
      return null;
    }

    const label = stringValue(item.label);
    const href = stringValue(item.href);

    if (!label || !href || (item.state !== "available" && item.state !== "preparing_flow")) {
      return null;
    }

    return {
      label,
      href,
      state: item.state,
    };
  });
}

function normalizeEventScheduleBlock(value: unknown): UnavailableSecretaryBlock | null {
  if (!isRecord(value) || value.state !== "event_schedule_unavailable") {
    return null;
  }

  return {
    state: "event_schedule_unavailable",
    summary: stringValue(value.summary) ?? "",
    next_step_label: null,
    items: [],
  };
}

function normalizeCommunicationPendingBlock(value: unknown): CommunicationPendingBlock | null {
  if (!isRecord(value) || !isCommunicationPendingState(value.state)) {
    return null;
  }

  return {
    state: value.state,
    summary: stringValue(value.summary) ?? "",
    total_count: normalizeCount(value.total_count),
    items: normalizeArray(value.items, normalizeCommunicationPendingItem),
  };
}

function normalizeCommunicationPendingItem(value: unknown): CommunicationPendingItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = stringValue(value.label);
  const nextStepLabel = stringValue(value.next_step_label);
  const href = stringValue(value.href);
  const count = normalizeCount(value.count);

  if (!label || !nextStepLabel || !href) {
    return null;
  }

  if (value.category === "visitor_follow_up_ready" || value.category === "member_update_ready") {
    const templateKey = stringValue(value.template_key);

    if (!templateKey) {
      return null;
    }

    return {
      category: value.category,
      label,
      count,
      next_step_label: nextStepLabel,
      template_key: templateKey,
      href,
      people_preview: normalizeArray(value.people_preview, normalizeCommunicationPendingPersonPreview),
    };
  }

  if (value.category === "missing_contact_for_communication") {
    return {
      category: "missing_contact_for_communication",
      label,
      count,
      next_step_label: nextStepLabel,
      template_key: null,
      href,
      people_preview: normalizeArray(value.people_preview, normalizeCommunicationPendingPersonPreview),
    };
  }

  if (value.category === "missing_template_for_communication") {
    const templateKey = stringValue(value.template_key);

    if (!templateKey) {
      return null;
    }

    return {
      category: "missing_template_for_communication",
      label,
      count,
      next_step_label: nextStepLabel,
      template_key: templateKey,
      href: "/communications",
      people_preview: [],
    };
  }

  return null;
}

function normalizeCommunicationPendingPersonPreview(value: unknown): CommunicationPendingPersonPreview | null {
  if (!isRecord(value)) {
    return null;
  }

  const displayName = stringValue(value.display_name);
  const status = stringValue(value.status);
  const statusLabel = stringValue(value.status_label);
  const contactSummary = stringValue(value.contact_summary);

  if (
    typeof value.person_id !== "number"
    || !Number.isSafeInteger(value.person_id)
    || value.person_id < 1
    || (value.person_type !== "member" && value.person_type !== "visitor")
    || !displayName
    || !status
    || !statusLabel
    || !contactSummary
  ) {
    return null;
  }

  return {
    person_id: value.person_id,
    person_type: value.person_type,
    display_name: displayName,
    status,
    status_label: statusLabel,
    contact_summary: contactSummary,
  };
}

function normalizeWeeklyChecklistBlock(value: unknown): WeeklyChecklistBlock | null {
  if (!isRecord(value) || value.state !== "weekly_checklist_ready") {
    return null;
  }

  return {
    state: "weekly_checklist_ready",
    items: normalizeArray(value.items, (item) => {
      if (!isRecord(item)) {
        return null;
      }

      const key = stringValue(item.key);
      const label = stringValue(item.label);

      if (!key || !label || item.state !== "not_started") {
        return null;
      }

      return {
        key,
        label,
        state: "not_started",
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function normalizeArray<T>(value: unknown, normalizeItem: (item: unknown) => T | null): T[] {
  return Array.isArray(value) ? value.map(normalizeItem).filter((item): item is T => item !== null) : [];
}

function isPeoplePendingItemsState(value: unknown): value is PeoplePendingItemsState {
  return value === "people_pending_items_loaded" || value === "empty_people_pending_items";
}

function isRecentVisitorsState(value: unknown): value is RecentVisitorsState {
  return value === "recent_visitors_loaded" || value === "empty_recent_visitors";
}

function isCommunicationPendingState(value: unknown): value is CommunicationPendingState {
  return value === "communication_pending_loaded"
    || value === "empty_communication_pending"
    || value === "blocked_missing_contact";
}
