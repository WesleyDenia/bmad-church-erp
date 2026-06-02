"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  ChurchUserErrorResponse,
  ChurchUserListItem,
  ChurchUserRole,
  ChurchUserStatus,
  UpdateChurchUserPayload,
  UpdateChurchUserResponse,
} from "@/features/church-users/contracts";

type ManagementStatus =
  | "loading_list"
  | "ready"
  | "empty_operational_users"
  | "saving_update"
  | "success_updated"
  | "validation_error"
  | "admin_membership_read_only"
  | "denied"
  | "session_invalid"
  | "server_error";

type DraftFieldErrors = NonNullable<ChurchUserErrorResponse["errors"]>;
type DraftState = Record<number, { role: ChurchUserRole; status: ChurchUserStatus }>;
type DraftErrors = Partial<Record<number, DraftFieldErrors>>;

type ChurchUserManagementPanelProps = {
  initialUsers: ChurchUserListItem[];
  initialStatus?: ManagementStatus;
  initialMessage?: string | null;
};

const roleOptions: Array<{ label: string; value: ChurchUserRole }> = [
  { label: "Tesouraria", value: "treasurer" },
  { label: "Secretaria", value: "secretary" },
  { label: "Lideranca", value: "leadership" },
];

const statusOptions: Array<{ label: string; value: ChurchUserStatus }> = [
  { label: "Ativo", value: "active" },
  { label: "Inativo", value: "inactive" },
];

function deriveInitialStatus(users: ChurchUserListItem[]): ManagementStatus {
  return users.some((user) => user.membership.role !== "administrator")
    ? "ready"
    : "empty_operational_users";
}

function buildInitialDrafts(users: ChurchUserListItem[]): DraftState {
  return users.reduce<DraftState>((drafts, user) => {
    if (user.membership.role === "administrator") {
      return drafts;
    }

    drafts[user.membership_id] = {
      role: user.membership.role,
      status: user.membership.status,
    };

    return drafts;
  }, {});
}

function classifyUpdateStatus(status: number, message: string): ManagementStatus {
  if (status === 401) {
    return "session_invalid";
  }

  if (status === 403) {
    return "denied";
  }

  if (status === 422) {
    return message.includes("somente leitura")
      ? "admin_membership_read_only"
      : "validation_error";
  }

  return "server_error";
}

function roleLabel(role: ChurchUserListItem["membership"]["role"]): string {
  switch (role) {
    case "administrator":
      return "Administracao";
    case "treasurer":
      return "Tesouraria";
    case "secretary":
      return "Secretaria";
    case "leadership":
      return "Lideranca";
  }
}

function statusLabel(status: ChurchUserStatus): string {
  return status === "active" ? "Ativo" : "Inativo";
}

function feedbackTone(status: ManagementStatus) {
  if (status === "loading_list") {
    return "border-[rgba(15,118,110,0.16)] bg-teal-50/70 text-teal-900";
  }

  return status === "success_updated"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-[rgba(153,27,27,0.18)] bg-red-50 text-red-800";
}

function badgeTone(kind: "role" | "status", value: string) {
  if (kind === "status") {
    return value === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  }

  return value === "administrator"
    ? "border-[rgba(15,118,110,0.18)] bg-teal-50 text-teal-800"
    : "border-[rgba(30,41,59,0.08)] bg-slate-100 text-slate-700";
}

export function ChurchUserManagementPanel({
  initialUsers,
  initialStatus,
  initialMessage = null,
}: ChurchUserManagementPanelProps) {
  const router = useRouter();
  const [isRefreshingList, startRefreshTransition] = useTransition();
  const [users, setUsers] = useState(initialUsers);
  const [drafts, setDrafts] = useState<DraftState>(() => buildInitialDrafts(initialUsers));
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [status, setStatus] = useState<ManagementStatus>(
    initialStatus ?? deriveInitialStatus(initialUsers),
  );
  const [feedback, setFeedback] = useState<string | null>(initialMessage);
  const [pendingMembershipId, setPendingMembershipId] = useState<number | null>(null);

  const pendingUser = useMemo(
    () => users.find((user) => user.membership_id === pendingMembershipId) ?? null,
    [pendingMembershipId, users],
  );
  const visualStatus: ManagementStatus = isRefreshingList ? "loading_list" : status;

  function updateDraft(
    membershipId: number,
    field: keyof UpdateChurchUserPayload,
    value: ChurchUserRole | ChurchUserStatus,
  ) {
    setDrafts((current) => ({
      ...current,
      [membershipId]: {
        ...(current[membershipId] ?? { role: "treasurer", status: "active" }),
        [field]: value,
      },
    }));
    setDraftErrors((current) => ({
      ...current,
      [membershipId]: undefined,
    }));
    if (feedback) {
      setFeedback(null);
    }
    if (status !== "saving_update") {
      setStatus(users.some((user) => user.membership.role !== "administrator") ? "ready" : "empty_operational_users");
    }
  }

  function resolvePayload(user: ChurchUserListItem): UpdateChurchUserPayload {
    if (user.membership.role === "administrator") {
      return {};
    }

    const draft = drafts[user.membership_id];

    if (!draft) {
      return {};
    }

    const payload: UpdateChurchUserPayload = {};

    if (draft.role !== user.membership.role) {
      payload.role = draft.role;
    }

    if (draft.status !== user.membership.status) {
      payload.status = draft.status;
    }

    return payload;
  }

  function openConfirmation(user: ChurchUserListItem) {
    if (user.membership.role === "administrator") {
      setStatus("admin_membership_read_only");
      setFeedback("Memberships administrativos sao somente leitura nesta area.");
      return;
    }

    if (Object.keys(resolvePayload(user)).length === 0) {
      setStatus("ready");
      setFeedback("Nao ha mudancas pendentes para este acesso.");
      return;
    }

    setPendingMembershipId(user.membership_id);
  }

  async function confirmUpdate() {
    if (pendingUser === null) {
      return;
    }

    const payload = resolvePayload(pendingUser);

    setStatus("saving_update");
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/users/${pendingUser.membership_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as
        | UpdateChurchUserResponse
        | ChurchUserErrorResponse;

      if (!response.ok) {
        const errorBody = body as ChurchUserErrorResponse;

        setDraftErrors((current) => ({
          ...current,
          [pendingUser.membership_id]: errorBody.errors ?? {},
        }));
        setStatus(classifyUpdateStatus(response.status, errorBody.message));
        setFeedback(errorBody.message);
        setPendingMembershipId(null);
        return;
      }

      const successBody = body as UpdateChurchUserResponse;

      setUsers((current) =>
        current.map((user) =>
          user.membership_id === successBody.data.membership_id
            ? {
                membership_id: successBody.data.membership_id,
                user: successBody.data.user,
                membership: successBody.data.membership,
                is_current_user: successBody.data.is_current_user,
              }
            : user,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [successBody.data.membership_id]: {
          role: successBody.data.membership.role as ChurchUserRole,
          status: successBody.data.membership.status,
        },
      }));
      setDraftErrors((current) => ({
        ...current,
        [successBody.data.membership_id]: undefined,
      }));
      setStatus("success_updated");
      setFeedback(successBody.data.message);
      setPendingMembershipId(null);
      startRefreshTransition(() => {
        router.refresh();
      });
    } catch {
      setStatus("server_error");
      setFeedback("Nao foi possivel atualizar o usuario agora. Tente novamente.");
      setPendingMembershipId(null);
    }
  }

  const operationalUsersCount = users.filter(
    (user) => user.membership.role !== "administrator",
  ).length;

  return (
    <section className="rounded-[2rem] border border-[color:var(--color-border)] bg-white/90 p-8 shadow-[0_20px_60px_rgba(30,41,59,0.08)]">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
          Gestao de acessos
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
          Acompanhar quem pode entrar e em qual papel
        </h2>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          Revise cada vinculo da igreja com calma. As mudancas passam a valer na
          proxima verificacao autenticada de quem recebeu o ajuste.
        </p>
      </div>

      {feedback ? (
        <div
          className={`mt-6 rounded-[1.5rem] border px-4 py-3 text-sm ${feedbackTone(visualStatus)}`}
        >
          {feedback}
        </div>
      ) : null}

      {visualStatus === "loading_list" && !feedback ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(15,118,110,0.16)] bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
          Atualizando a lista de acessos da igreja.
        </div>
      ) : null}

      {operationalUsersCount === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(15,118,110,0.12)] bg-teal-50/70 px-5 py-4 text-sm text-teal-900">
          Ainda nao ha usuarios operacionais alem da administracao atual. Use o
          cadastro acima para liberar o primeiro acesso de trabalho.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {users.map((user) => {
          const draft = drafts[user.membership_id];
          const errors = draftErrors[user.membership_id];
          const payload = resolvePayload(user);
          const hasPendingChanges = Object.keys(payload).length > 0;
          const isAdminMembership = user.membership.role === "administrator";
          const isSaving =
            (status === "saving_update" && pendingMembershipId === user.membership_id) ||
            isRefreshingList;

          return (
            <article
              key={user.membership_id}
              className="rounded-[1.75rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-[color:var(--color-foreground)]">
                      {user.user.name}
                    </h3>
                    {user.is_current_user ? (
                      <span className="rounded-full border border-[rgba(15,118,110,0.18)] bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
                        Sua sessao
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                    {user.user.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone("role", user.membership.role)}`}
                  >
                    {roleLabel(user.membership.role)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone("status", user.membership.status)}`}
                  >
                    {statusLabel(user.membership.status)}
                  </span>
                </div>
              </div>

              {isAdminMembership ? (
                <div className="mt-5 rounded-[1.25rem] border border-[rgba(15,118,110,0.16)] bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
                  Este membership administrativo permanece visivel, mas nesta
                  story continua somente leitura para preservar a administracao
                  minima viavel da igreja.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div>
                    <Label htmlFor={`church-user-role-${user.membership_id}`}>
                      Perfil operacional
                    </Label>
                    <Select
                      id={`church-user-role-${user.membership_id}`}
                      value={draft?.role ?? "treasurer"}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateDraft(
                          user.membership_id,
                          "role",
                          event.target.value as ChurchUserRole,
                        )
                      }
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {errors?.role?.length ? (
                      <p className="mt-2 text-sm font-medium text-red-700">
                        {errors.role[0]}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Label htmlFor={`church-user-status-${user.membership_id}`}>
                      Status de acesso
                    </Label>
                    <Select
                      id={`church-user-status-${user.membership_id}`}
                      value={draft?.status ?? "active"}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateDraft(
                          user.membership_id,
                          "status",
                          event.target.value as ChurchUserStatus,
                        )
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {errors?.status?.length ? (
                      <p className="mt-2 text-sm font-medium text-red-700">
                        {errors.status[0]}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="w-full rounded-[1.25rem] md:w-auto"
                      disabled={isSaving}
                      onClick={() => openConfirmation(user)}
                    >
                      {isSaving
                        ? "Salvando..."
                        : hasPendingChanges
                          ? "Confirmar ajuste"
                          : "Sem mudancas"}
                    </Button>
                  </div>

                  {errors?.membership?.length || errors?.payload?.length ? (
                    <div className="md:col-span-3 rounded-[1.25rem] border border-[rgba(153,27,27,0.18)] bg-red-50 px-4 py-3 text-sm text-red-800">
                      {errors.membership?.[0] ?? errors.payload?.[0]}
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Dialog
        open={pendingUser !== null}
        onOpenChange={(open) => {
          if (!open && status !== "saving_update") {
            setPendingMembershipId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar ajuste de acesso</DialogTitle>
            <DialogDescription>
              {pendingUser
                ? `Voce vai atualizar o acesso de ${pendingUser.user.name}. O sistema aplicara o novo perfil ou status na proxima verificacao autenticada dessa pessoa.`
                : "Revise as mudancas antes de confirmar."}
            </DialogDescription>
          </DialogHeader>

          {pendingUser ? (
            <div className="rounded-[1.25rem] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-4 text-sm text-slate-800">
              {Object.entries(resolvePayload(pendingUser)).map(([field, value]) => (
                <p key={field} className="leading-7">
                  {field === "role"
                    ? `Novo perfil: ${roleLabel(value as ChurchUserRole)}`
                    : `Novo status: ${statusLabel(value as ChurchUserStatus)}`}
                </p>
              ))}
            </div>
          ) : null}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              className="rounded-[1.25rem]"
              disabled={status === "saving_update" || isRefreshingList}
              onClick={() => setPendingMembershipId(null)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              className="rounded-[1.25rem]"
              disabled={status === "saving_update" || isRefreshingList}
              onClick={() => void confirmUpdate()}
            >
              {status === "saving_update" || isRefreshingList
                ? "Salvando..."
                : "Aplicar ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
