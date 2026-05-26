import { cookies } from "next/headers";
import { AccessDeniedPanel } from "@/components/operational/access-denied-panel";
import { ChurchUserCreateForm } from "@/components/operational/church-user-create-form";
import {
  AUTH_SESSION_COOKIE_NAME,
  decodeJwtPayload,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";

type AdminUsersSessionResult =
  | {
      ok: true;
      roles: string[];
    }
  | {
      ok: false;
      message: string;
    };

function readRolesFromToken(token: string): string[] {
  const payload = decodeJwtPayload(token);
  const roles = payload?.roles;

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.filter((role): role is string => typeof role === "string" && role.length > 0);
}

async function loadSession(): Promise<AdminUsersSessionResult> {
  const cookieStore = await cookies();
  const token = readSessionTokenFromCookieValue(
    cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value,
  );

  if (!token) {
    return {
      ok: false,
      message: "Entre novamente para acessar a administracao de usuarios.",
    } satisfies AdminUsersSessionResult;
  }

  const roles = readRolesFromToken(token);

  if (roles.length === 0) {
    return {
      ok: false,
      message: "Sessao invalida. Entre novamente.",
    } satisfies AdminUsersSessionResult;
  }

  return {
    ok: true,
    roles,
  } satisfies AdminUsersSessionResult;
}

export default async function AdminUsersPage() {
  const sessionResult = await loadSession();

  if (!sessionResult.ok) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
        <AccessDeniedPanel
          title="Sessao necessaria"
          message={sessionResult.message}
        />
      </main>
    );
  }

  if (!sessionResult.roles.includes("administrator")) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
        <AccessDeniedPanel
          title="Usuarios do sistema"
          message="Seu perfil atual nao permite cadastrar usuarios do sistema."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
      <ChurchUserCreateForm />
    </main>
  );
}
