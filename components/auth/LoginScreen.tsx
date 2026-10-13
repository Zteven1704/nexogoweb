"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { getAuthErrorMessage, signInWithEmail } from "@/lib/auth";

const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-nexo-blue focus:ring-2 focus:ring-nexo-blue/20";

export function LoginScreen() {
  const router = useRouter();
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "authenticated") {
      router.replace("/app");
    }
  }, [router, session.status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Escribe tu correo electrónico.");
      return;
    }

    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }

    setSubmitting(true);

    try {
      await signInWithEmail(email, password);
      router.replace("/app");
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
      setSubmitting(false);
    }
  }

  if (session.status === "loading" || session.status === "authenticated") {
    return <AuthPending label="Comprobando sesión" />;
  }

  const visibleError = error ?? (session.status === "error" ? session.message : null);

  return (
    <main className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-[0_24px_60px_-40px_rgba(10,35,66,0.45)] sm:p-10">
        <Link href="/" aria-label="NexoGo, ir al inicio" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-nexo-deep">Iniciar sesión</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Accede con el correo y la contraseña de tu cuenta.
        </p>
        <form className="mt-8" onSubmit={onSubmit} noValidate>
          <label className="block text-sm font-medium text-nexo-deep" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
            disabled={submitting}
            required
          />
          <label className="mt-5 block text-sm font-medium text-nexo-deep" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
            disabled={submitting}
            required
          />
          {visibleError ? (
            <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
              {visibleError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-nexo-deep px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Iniciando sesión" : "Iniciar sesión"}
          </button>
        </form>
        <Link
          href="/"
          className="mt-6 inline-flex text-sm font-medium text-nexo-blue transition hover:text-nexo-deep"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

function AuthPending({ label }: { label: string }) {
  return (
    <main className="grid min-h-full place-items-center px-6">
      <p className="text-sm font-medium text-muted" role="status">
        {label}
      </p>
    </main>
  );
}
