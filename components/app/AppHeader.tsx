"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { readActiveCompanyName } from "@/lib/company";

type AppHeaderProps = {
  email: string | null;
  signingOut: boolean;
  onSignOut: () => void;
  onOpenMenu: () => void;
  menuOpen: boolean;
  menuId: string;
};

type CompanyLabel =
  | { status: "loading" }
  | { status: "no-company" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; name: string };

export function AppHeader({
  email,
  signingOut,
  onSignOut,
  onOpenMenu,
  menuOpen,
  menuId,
}: AppHeaderProps) {
  const session = useAuthSession();
  const [company, setCompany] = useState<CompanyLabel>({ status: "loading" });
  const account = email ?? "No hay un correo asociado a esta cuenta.";
  const companyText =
    company.status === "loading"
      ? "Cargando empresa"
      : company.status === "no-company"
        ? "Sin empresa activa"
        : company.status === "missing"
          ? "Sin nombre"
          : company.status === "error"
            ? "No se pudo cargar"
            : company.name;

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    const userId = session.user.uid;
    let cancelled = false;

    readActiveCompanyName(userId)
      .then((result) => {
        if (!cancelled) {
          setCompany(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompany({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-nexo-deep lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={onOpenMenu}
        >
          <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
          <MenuIcon />
        </button>
        <div className="min-w-0 flex-1 sm:max-w-56" aria-label="Empresa activa">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Empresa</p>
          <p
            className={`truncate text-sm ${company.status === "ready" ? "font-medium text-nexo-deep" : "text-slate-400"}`}
            role={company.status === "loading" ? "status" : company.status === "error" ? "alert" : undefined}
          >
            {companyText}
          </p>
        </div>
        <div className="ml-auto hidden min-w-0 max-w-xs text-right sm:block">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Cuenta</p>
          <p className="truncate text-sm font-medium text-nexo-deep">{account}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-nexo-deep transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? "Cerrando sesión" : "Cerrar sesión"}
        </button>
      </div>
      <p className="truncate border-t border-line px-4 py-2.5 text-sm font-medium text-nexo-deep sm:hidden">
        {account}
      </p>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
