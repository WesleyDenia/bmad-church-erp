"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";
import {
  categoryLabel,
  isBaseTemplatesOnly,
  normalizeCommunicationTemplateResponse,
  suggestedChannelLabel,
  type CommunicationTemplate,
  type CommunicationTemplateErrorResponse,
  type CommunicationTemplateResponse,
  type CommunicationTemplateState,
} from "@/features/communications/communication-template";

type CommunicationTemplateUiState = {
  state: CommunicationTemplateState;
  templates: CommunicationTemplate[];
  message: string | null;
};

function extractMessage(body: CommunicationTemplateResponse | CommunicationTemplateErrorResponse | unknown): string {
  return body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).message === "string"
    ? (body as Record<string, string>).message
    : "Nao foi possivel carregar os modelos de comunicacao agora.";
}

function normalizeState(status: number, templates: CommunicationTemplate[]): CommunicationTemplateState {
  if (status === 401 || status === 403) {
    return "denied_or_session_invalid";
  }

  if (templates.length > 0 && isBaseTemplatesOnly(templates)) {
    return "base_templates_only";
  }

  if (templates.length > 0) {
    return "templates_loaded";
  }

  return "server_error";
}

function StatusMessage({ state, message }: { state: CommunicationTemplateState; message: string | null }) {
  if (state === "loading_communication_templates") {
    return (
      <p className="text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
        Carregando modelos pelo BFF da aplicacao.
      </p>
    );
  }

  if (state === "denied_or_session_invalid") {
    return (
      <p className="text-sm leading-7 text-[#9f1239]" aria-live="polite">
        {message ?? "Sessao invalida ou perfil sem acesso."}
      </p>
    );
  }

  if (state === "server_error") {
    return (
      <p className="text-sm leading-7 text-[#9f1239]" aria-live="polite">
        {message ?? "Nao foi possivel carregar os modelos de comunicacao agora."}
      </p>
    );
  }

  if (state === "base_templates_only") {
    return (
      <p className="text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
        Modelos base disponiveis para reduzir retrabalho nas mensagens recorrentes.
      </p>
    );
  }

  return (
    <p className="text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
      Modelos disponiveis para a rotina de comunicacao.
    </p>
  );
}

function TemplateRows({ templates }: { templates: CommunicationTemplate[] }) {
  return (
    <ul className="mt-6 grid gap-4">
      {templates.map((template) => (
        <li
          key={template.template_key}
          className="grid gap-4 rounded-md border border-[color:var(--color-border)] bg-white p-4 md:grid-cols-[1fr_12rem_12rem_11rem] md:items-center"
        >
          <div className="min-w-0">
            <p className="text-base font-semibold text-[color:var(--color-foreground)]">
              {template.name}
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
              {template.short_description}
            </p>
          </div>
          <span className="w-fit rounded-md border border-[color:var(--color-border)] px-3 py-1 text-sm font-semibold text-[color:var(--color-foreground)]">
            {categoryLabel(template.category)}
          </span>
          <span className="text-sm font-medium text-[color:var(--color-foreground)]">
            {suggestedChannelLabel(template.suggested_channel)}
          </span>
          <Button type="button" variant="secondary" size="sm" disabled>
            Preparar em etapa futura
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function CommunicationTemplateList() {
  const [uiState, setUiState] = useState<CommunicationTemplateUiState>({
    state: "loading_communication_templates",
    templates: [],
    message: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const loadTemplates = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setUiState({
      state: "loading_communication_templates",
      templates: [],
      message: null,
    });

    try {
      const response = await fetch("/api/communications/templates", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json();

      if (!response.ok) {
        setUiState({
          state: response.status === 401 || response.status === 403 ? "denied_or_session_invalid" : "server_error",
          templates: [],
          message: extractMessage(body),
        });

        return;
      }

      const normalized = normalizeCommunicationTemplateResponse(body);

      if (!normalized) {
        setUiState({
          state: "server_error",
          templates: [],
          message: "Nao foi possivel carregar os modelos de comunicacao agora.",
        });

        return;
      }

      setUiState({
        state: normalizeState(response.status, normalized.data),
        templates: normalized.data,
        message: null,
      });
    } catch {
      if (controller.signal.aborted) {
        return;
      }

      setUiState({
        state: "server_error",
        templates: [],
        message: "Nao foi possivel carregar os modelos de comunicacao agora.",
      });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadTemplates();
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [loadTemplates]);

  const hasTemplates = uiState.templates.length > 0;
  const canRetry = uiState.state === "server_error";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <Surface className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
              Comunicacao
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[color:var(--color-foreground)] sm:text-4xl">
              Modelos pre-definidos
            </h1>
            <div className="mt-4 max-w-2xl">
              <StatusMessage state={uiState.state} message={uiState.message} />
            </div>
          </div>

          <Button type="button" variant="secondary" onClick={loadTemplates} disabled={uiState.state === "loading_communication_templates"}>
            {canRetry ? "Tentar novamente" : "Atualizar"}
          </Button>
        </div>

        {hasTemplates ? (
          <TemplateRows templates={uiState.templates} />
        ) : uiState.state === "loading_communication_templates" ? (
          <div className="mt-6 grid gap-4" aria-hidden="true">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 rounded-md border border-[color:var(--color-border)] bg-[#f8faf9]" />
            ))}
          </div>
        ) : null}
      </Surface>
    </main>
  );
}
