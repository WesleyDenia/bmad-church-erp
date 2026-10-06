"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Surface } from "@/components/design-system/surface";
import { CommunicationMessageHandoffActions } from "@/components/operational/communication-message-handoff-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CommunicationTemplate } from "@/features/communications/communication-template";
import {
  hasMissingContact,
  normalizeCommunicationMessageDraftResponse,
  type CommunicationMessageDraftResponse,
  type CommunicationMessageDraftState,
  type SecretaryHomeCommunicationContext,
} from "@/features/communications/message-draft";
import {
  canPresentCommunicationHandoff,
  COMMUNICATION_HANDOFF_MAX_CODE_POINTS,
  countCommunicationMessageCodePoints,
  isCurrentCommunicationDraftRequest,
  shouldPreserveCommunicationDraftForPerson,
} from "@/features/communications/message-handoff";
import {
  normalizePersonSearchResponse,
  type PersonSearchItem,
} from "@/features/people/person-search";

type ComposerProps = {
  selectedTemplate: CommunicationTemplate | null;
  secretaryHomeContext: SecretaryHomeCommunicationContext | null;
  contextState: "communication_context_loaded" | "communication_context_invalid" | null;
};

type ComposerState = {
  state: CommunicationMessageDraftState;
  people: PersonSearchItem[];
  selectedPersonKey: string;
  query: string;
  message: string | null;
  draft: CommunicationMessageDraftResponse | null;
  draftText: string;
  draftRevision: number;
  draftEditMessage: string | null;
};

function personKey(person: PersonSearchItem): string {
  return `${person.person_type}:${person.id}`;
}

function contextPersonKey(context: SecretaryHomeCommunicationContext): string {
  return `${context.person_type}:${context.person_id}`;
}

function parsePersonKey(value: string): { person_type: "member" | "visitor"; person_id: number } | null {
  const [personType, id] = value.split(":");
  const personId = Number(id);

  if ((personType !== "member" && personType !== "visitor") || !Number.isSafeInteger(personId) || personId < 1) {
    return null;
  }

  return {
    person_type: personType,
    person_id: personId,
  };
}

function messageFromBody(body: unknown, fallback: string): string {
  return body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).message === "string"
    ? (body as Record<string, string>).message
    : fallback;
}

function hasTemplateAndPerson(template: CommunicationTemplate | null, selectedPersonKey: string): boolean {
  return template !== null && parsePersonKey(selectedPersonKey) !== null;
}

export function CommunicationMessageComposer({
  selectedTemplate,
  secretaryHomeContext,
  contextState,
}: ComposerProps) {
  const [composer, setComposer] = useState<ComposerState>({
    state: contextState ?? "loading_people_for_message",
    people: [],
    selectedPersonKey: secretaryHomeContext ? contextPersonKey(secretaryHomeContext) : "",
    query: "",
    message: contextState === "communication_context_invalid" ? "O contexto informado nao pode ser usado. Escolha uma pessoa manualmente." : null,
    draft: null,
    draftText: "",
    draftRevision: 0,
    draftEditMessage: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const draftRequestRef = useRef(0);

  const selectedPerson = useMemo(
    () => composer.people.find((person) => personKey(person) === composer.selectedPersonKey) ?? null,
    [composer.people, composer.selectedPersonKey],
  );

  const loadPeople = useCallback(async (query: string): Promise<void> => {
    draftRequestRef.current += 1;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    const searchParams = new URLSearchParams({
      person_type: "all",
      status: "active,needs_update,new,follow_up_needed,contacted",
      contact: "all",
      per_page: "25",
    });
    const trimmedQuery = query.trim();

    if (trimmedQuery !== "") {
      searchParams.set("q", trimmedQuery);
    }

    setComposer((current) => ({
      ...current,
      state: "loading_people_for_message",
      message: null,
      people: [],
    }));

    try {
      const response = await fetch("/api/secretary/people" + `?${searchParams.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json();

      if (!response.ok) {
        setComposer((current) => ({
          ...current,
          state: response.status === 401 || response.status === 403 ? "denied_or_session_invalid" : "server_error",
          people: [],
          selectedPersonKey: "",
          draft: null,
          draftText: "",
          draftEditMessage: null,
          message: messageFromBody(body, "Nao foi possivel carregar as pessoas agora."),
        }));

        return;
      }

      const normalized = normalizePersonSearchResponse(body);

      if (!normalized) {
        setComposer((current) => ({
          ...current,
          state: "server_error",
          people: [],
          selectedPersonKey: "",
          draft: null,
          draftText: "",
          draftEditMessage: null,
          message: "Nao foi possivel carregar as pessoas agora.",
        }));

        return;
      }

      setComposer((current) => {
        const currentPersonStillVisible = normalized.data.some((person) => personKey(person) === current.selectedPersonKey);
        const nextPersonKey = secretaryHomeContext
          ? contextPersonKey(secretaryHomeContext)
          : currentPersonStillVisible ? current.selectedPersonKey : "";
        const hasLoadedContext = secretaryHomeContext && selectedTemplate?.template_key === secretaryHomeContext.template_key;

        if (contextState === "communication_context_invalid") {
          return {
            ...current,
            state: "communication_context_invalid",
            people: normalized.data,
            selectedPersonKey: "",
            draft: null,
            draftText: "",
            draftRevision: current.draftRevision + 1,
            draftEditMessage: null,
            message: "O contexto informado nao pode ser usado. Escolha uma pessoa manualmente.",
          };
        }

        const preserveDraft = shouldPreserveCommunicationDraftForPerson(
          current.selectedPersonKey,
          nextPersonKey,
          current.draft !== null,
        );

        return {
          ...current,
          state: preserveDraft && current.draft
            ? hasMissingContact(current.draft) ? "draft_has_missing_contact" : "message_draft_ready"
            : hasLoadedContext
              ? "communication_context_loaded"
              : hasTemplateAndPerson(selectedTemplate, nextPersonKey) ? "ready_to_prepare_message" : "validation_error",
          people: normalized.data,
          selectedPersonKey: nextPersonKey,
          draft: preserveDraft ? current.draft : null,
          draftText: preserveDraft ? current.draftText : "",
          draftRevision: preserveDraft ? current.draftRevision : current.draftRevision + 1,
          draftEditMessage: preserveDraft ? current.draftEditMessage : null,
          message: hasLoadedContext
            ? "Pendencia da secretaria carregada. Prepare o rascunho quando estiver pronta."
            : normalized.data.length === 0 ? "Nenhuma pessoa encontrada para estes criterios." : null,
        };
      });
    } catch {
      if (controller.signal.aborted) {
        return;
      }

      setComposer((current) => ({
        ...current,
        state: "server_error",
        people: [],
        selectedPersonKey: "",
        draft: null,
        draftText: "",
        draftEditMessage: null,
        message: "Nao foi possivel carregar as pessoas agora.",
      }));
    }
  }, [contextState, secretaryHomeContext, selectedTemplate]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPeople("");
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [loadPeople]);

  function handlePersonChange(value: string): void {
    draftRequestRef.current += 1;
    setComposer((current) => ({
      ...current,
      selectedPersonKey: value,
      state: hasTemplateAndPerson(selectedTemplate, value) ? "ready_to_prepare_message" : "validation_error",
      draft: null,
      draftText: "",
      draftEditMessage: null,
      message: null,
    }));
  }

  async function prepareDraft(): Promise<void> {
    const personPayload = parsePersonKey(composer.selectedPersonKey);

    if (!selectedTemplate || !personPayload) {
      setComposer((current) => ({
        ...current,
        state: "validation_error",
        message: "Escolha um modelo e uma pessoa antes de preparar.",
      }));

      return;
    }

    const requestId = draftRequestRef.current + 1;
    draftRequestRef.current = requestId;
    const requestedPersonKey = composer.selectedPersonKey;

    setComposer((current) => ({
      ...current,
      state: "generating_message_draft",
      draft: null,
      draftText: "",
      draftEditMessage: null,
      message: null,
    }));

    try {
      const response = await fetch("/api/communications/message-drafts", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_key: selectedTemplate.template_key,
          person_type: personPayload.person_type,
          person_id: personPayload.person_id,
        }),
      });
      const body = await response.json();

      if (requestId !== draftRequestRef.current) {
        return;
      }

      if (!response.ok) {
        setComposer((current) => ({
          ...current,
          state: response.status === 401 || response.status === 403
            ? "denied_or_session_invalid"
            : response.status === 422
              ? "validation_error"
              : "server_error",
          draft: null,
          draftText: "",
          draftEditMessage: null,
          message: messageFromBody(body, "Nao foi possivel preparar a mensagem agora."),
        }));

        return;
      }

      const normalized = normalizeCommunicationMessageDraftResponse(body);

      if (!normalized) {
        setComposer((current) => ({
          ...current,
          state: "server_error",
          draft: null,
          draftText: "",
          draftEditMessage: null,
          message: "Nao foi possivel preparar a mensagem agora.",
        }));

        return;
      }

      setComposer((current) => {
        if (!isCurrentCommunicationDraftRequest(
          requestId,
          draftRequestRef.current,
          requestedPersonKey,
          current.selectedPersonKey,
        )) {
          return current;
        }

        return {
          ...current,
          state: hasMissingContact(normalized) ? "draft_has_missing_contact" : "message_draft_ready",
          draft: normalized,
          draftText: normalized.data.draft.message_body,
          draftRevision: current.draftRevision + 1,
          draftEditMessage: null,
          message: null,
        };
      });
    } catch {
      if (requestId !== draftRequestRef.current) {
        return;
      }

      setComposer((current) => ({
        ...current,
        state: "server_error",
        draft: null,
        draftText: "",
        draftEditMessage: null,
        message: "Nao foi possivel preparar a mensagem agora.",
      }));
    }
  }

  function handleDraftChange(nextText: string): void {
    const codePointCount = countCommunicationMessageCodePoints(nextText);

    if (codePointCount > COMMUNICATION_HANDOFF_MAX_CODE_POINTS) {
      setComposer((current) => ({
        ...current,
        draftEditMessage: "A mensagem pode ter no maximo 5000 caracteres.",
      }));
      return;
    }

    setComposer((current) => ({
      ...current,
      draftText: nextText,
      draftRevision: current.draftRevision + 1,
      draftEditMessage: null,
    }));
  }

  const isLoadingPeople = composer.state === "loading_people_for_message";
  const isGenerating = composer.state === "generating_message_draft";
  const canPrepare = selectedTemplate !== null && parsePersonKey(composer.selectedPersonKey) !== null && !isGenerating;
  const hasContextSelection = secretaryHomeContext !== null
    && composer.selectedPersonKey === contextPersonKey(secretaryHomeContext);
  const shouldShowContextOption = hasContextSelection && selectedPerson === null;
  const canShowHandoff = canPresentCommunicationHandoff(composer.state, composer.draft !== null);

  return (
    <Surface className="mt-6 p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid content-start gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
              Preparacao
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--color-foreground)]">
              Mensagem personalizada
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]" aria-live="polite">
              {selectedTemplate ? `Modelo selecionado: ${selectedTemplate.name}` : "Escolha um modelo ativo para preparar a mensagem."}
            </p>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-semibold text-[color:var(--color-foreground)]" htmlFor="message-person-search">
              Buscar pessoa
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                id="message-person-search"
                value={composer.query}
                onChange={(event) => setComposer((current) => ({ ...current, query: event.target.value }))}
                placeholder="Nome do membro ou visitante"
              />
              <Button type="button" variant="secondary" onClick={() => void loadPeople(composer.query)} disabled={isLoadingPeople}>
                Buscar
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-semibold text-[color:var(--color-foreground)]" htmlFor="message-person-select">
              Pessoa
            </label>
            <Select
              id="message-person-select"
              value={composer.selectedPersonKey}
              onChange={(event) => handlePersonChange(event.target.value)}
              disabled={isLoadingPeople || (composer.people.length === 0 && !hasContextSelection)}
            >
              <option value="">{isLoadingPeople ? "Carregando pessoas" : "Selecione uma pessoa"}</option>
              {shouldShowContextOption ? (
                <option value={composer.selectedPersonKey}>
                  Pendencia da secretaria carregada
                </option>
              ) : null}
              {composer.people.map((person) => (
                <option key={personKey(person)} value={personKey(person)}>
                  {person.display_name} - {person.person_type_label} - {person.status_label}
                </option>
              ))}
            </Select>
          </div>

          {selectedPerson ? (
            <div className="rounded-md border border-[color:var(--color-border)] bg-[#f8faf9] p-4 text-sm leading-6 text-[color:var(--color-foreground)]">
              <p className="font-semibold">{selectedPerson.display_name}</p>
              <p className="text-[color:var(--color-muted)]">
                {selectedPerson.person_type_label} - {selectedPerson.status_label} - {selectedPerson.contact_summary}
              </p>
            </div>
          ) : secretaryHomeContext && composer.selectedPersonKey === contextPersonKey(secretaryHomeContext) ? (
            <div className="rounded-md border border-[color:var(--color-border)] bg-[#f8faf9] p-4 text-sm leading-6 text-[color:var(--color-foreground)]">
              <p className="font-semibold">Pendencia da secretaria carregada</p>
              <p className="text-[color:var(--color-muted)]">
                Prepare o rascunho sem nova busca manual.
              </p>
            </div>
          ) : null}

          {composer.message ? (
            <p className="text-sm leading-6 text-[#9f1239]" aria-live="polite">
              {composer.message}
            </p>
          ) : null}

          <Button type="button" onClick={() => void prepareDraft()} disabled={!canPrepare}>
            {isGenerating ? "Preparando" : "Preparar mensagem"}
          </Button>
        </div>

        <div className="grid content-start gap-4">
          {composer.draft ? (
            <>
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]" htmlFor="message-draft-text">
                Rascunho editavel
              </label>
              <Textarea
                id="message-draft-text"
                className="min-h-[18rem] resize-y text-base leading-7"
                value={composer.draftText}
                onChange={(event) => handleDraftChange(event.target.value)}
                aria-describedby="message-draft-count message-draft-edit-feedback"
              />
              <div className="flex flex-wrap items-start justify-between gap-2 text-sm leading-6">
                <p id="message-draft-count" className="text-[color:var(--color-muted)]">
                  {countCommunicationMessageCodePoints(composer.draftText)}/{COMMUNICATION_HANDOFF_MAX_CODE_POINTS} caracteres
                </p>
                {composer.draftEditMessage ? (
                  <p id="message-draft-edit-feedback" role="alert" className="text-[#9f1239]">
                    {composer.draftEditMessage}
                  </p>
                ) : (
                  <span id="message-draft-edit-feedback" />
                )}
              </div>
              {canShowHandoff ? (
                <CommunicationMessageHandoffActions
                  draftText={composer.draftText}
                  draftRevision={composer.draftRevision}
                  missingFields={composer.draft.data.draft.missing_fields}
                />
              ) : null}
            </>
          ) : (
            <div className="min-h-[18rem] rounded-md border border-dashed border-[color:var(--color-border)] bg-[#f8faf9] p-5 text-sm leading-7 text-[color:var(--color-muted)]">
              O rascunho aparece aqui depois da preparacao.
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
}
