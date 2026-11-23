"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LogoutPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isSigningOutRef = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    if (isSigningOutRef.current) {
      return;
    }

    isSigningOutRef.current = true;
    setIsSigningOut(true);
    setFeedback(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      router.replace("/login");
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setFeedback(
        "Nao foi possivel encerrar sua sessao agora. Tente novamente em instantes.",
      );
      setIsSigningOut(false);
    } finally {
      window.clearTimeout(timeout);
      isSigningOutRef.current = false;
    }
  }, [router]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void signOut();
  }, [signOut]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-10">
      <section className="w-full max-w-lg rounded-[2rem] border border-[color:var(--color-border)] bg-white/88 p-8 text-center shadow-[0_24px_80px_rgba(30,41,59,0.10)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
          Sessao
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
          {isSigningOut ? "Encerrando sua sessao..." : "Nao foi possivel sair"}
        </h1>
        <p
          aria-live="polite"
          className="mt-4 text-base leading-8 text-[color:var(--color-muted)]"
        >
          {feedback ?? "Aguarde um instante enquanto protegemos o acesso da sua conta."}
        </p>
        {feedback ? (
          <div className="mt-8 flex justify-center gap-3">
            <Button disabled={isSigningOut} onClick={() => void signOut()}>
              Tentar novamente
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">Ir para login</Link>
            </Button>
          </div>
        ) : null}
        <noscript>
          <form action="/api/auth/logout" method="post">
            <button type="submit">Encerrar sessao</button>
          </form>
        </noscript>
      </section>
    </main>
  );
}
