import { headers } from "next/headers";
import { AccessDeniedPanel } from "@/components/operational/access-denied-panel";
import { ChurchUserCreateForm } from "@/components/operational/church-user-create-form";
import { ChurchUserManagementPanel } from "@/components/operational/church-user-management-panel";
import type {
  AuthenticatedSessionResponse,
  ChurchRole,
} from "@/features/auth/session-types";
import type {
  ChurchUserListItem,
  ListChurchUsersResponse,
} from "@/features/church-users/contracts";

type SessionResult =
  | {
      ok: true;
      role: ChurchRole;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

type ChurchUsersResult =
  | {
      ok: true;
      users: ChurchUserListItem[];
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

async function fetchFromBff(path: string): Promise<Response> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookie = requestHeaders.get("cookie") ?? "";
  const baseUrl = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  return fetch(new URL(path, baseUrl), {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });
}

async function loadSession(): Promise<SessionResult> {
  try {
    const response = await fetchFromBff("/api/auth/me");
    const body = (await response.json()) as
      | AuthenticatedSessionResponse
      | { message?: string };

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          "message" in body && typeof body.message === "string"
            ? body.message
            : "Sessao invalida. Entre novamente.",
      };
    }

    if (!("data" in body)) {
      return {
        ok: false,
        status: 502,
        message: "Nao foi possivel validar sua sessao agora.",
      };
    }

    return {
      ok: true,
      role: body.data.role,
    };
  } catch {
    return {
      ok: false,
      status: 500,
      message: "Nao foi possivel validar sua sessao agora.",
    };
  }
}

async function loadChurchUsers(): Promise<ChurchUsersResult> {
  try {
    const response = await fetchFromBff("/api/admin/users");
    const body = (await response.json()) as
      | ListChurchUsersResponse
      | { message?: string };

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          "message" in body && typeof body.message === "string"
            ? body.message
            : "Nao foi possivel carregar os usuarios da igreja agora.",
      };
    }

    if (!("data" in body)) {
      return {
        ok: false,
        status: 502,
        message: "Nao foi possivel carregar os usuarios da igreja agora.",
      };
    }

    return {
      ok: true,
      users: body.data,
    };
  } catch {
    return {
      ok: false,
      status: 500,
      message: "Nao foi possivel carregar os usuarios da igreja agora.",
    };
  }
}

export default async function AdminUsersPage() {
  const sessionResult = await loadSession();

  if (!sessionResult.ok) {
    const title =
      sessionResult.status === 401
        ? "Sessao necessaria"
        : sessionResult.status === 403
          ? "Usuarios do sistema"
          : "Nao foi possivel validar agora";

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
        <AccessDeniedPanel
          title={title}
          message={sessionResult.message}
        />
      </main>
    );
  }

  if (sessionResult.role !== "administrator") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
        <AccessDeniedPanel
          title="Usuarios do sistema"
          message="Seu perfil atual nao permite gerenciar usuarios do sistema."
        />
      </main>
    );
  }

  const usersResult = await loadChurchUsers();

  if (!usersResult.ok && (usersResult.status === 401 || usersResult.status === 403)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
        <AccessDeniedPanel
          title={usersResult.status === 401 ? "Sessao necessaria" : "Usuarios do sistema"}
          message={usersResult.message}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <ChurchUserCreateForm />
      <ChurchUserManagementPanel
        initialUsers={usersResult.ok ? usersResult.users : []}
        initialStatus={usersResult.ok ? undefined : "server_error"}
        initialMessage={usersResult.ok ? null : usersResult.message}
      />
    </main>
  );
}
