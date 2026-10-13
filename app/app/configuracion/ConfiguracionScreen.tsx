"use client";

import { FirebaseError } from "firebase/app";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { Icon, type IconName } from "@/components/Icon";
import { signOutUser } from "@/lib/auth";
import { resolveActiveCompanyId } from "@/lib/company";
import { getFirebaseFirestore } from "@/lib/firebase";
import { brand } from "@/lib/site";

const aboutDescription =
  "NexoGo es una plataforma empresarial multisectorial para organizar y gestionar la operación de diferentes tipos de empresas.";

const primaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-nexo-deep px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-nexo-deep transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:opacity-60";

const cardClass =
  "rounded-2xl border border-line bg-white p-5 shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)] sm:p-6";

type CompanyView = {
  name: string;
  legalName: string;
  taxId: string;
  phone: string;
  primaryContactEmail: string;
  address: string;
  locale: string;
  timezone: string;
};

type CompanyLoad =
  | { status: "loading" }
  | { status: "no-company" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; company: CompanyView };

type Detail = "ayuda" | "acerca" | null;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatAddress(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return "";
  }

  const address = value as Record<string, unknown>;

  return ["street", "city", "region", "country", "postalCode"]
    .map((key) => asString(address[key]))
    .filter((part) => part.length > 0)
    .join(", ");
}

function brandingValue(value: unknown, key: "locale" | "timezone"): string {
  if (typeof value !== "object" || value === null) {
    return "";
  }

  return asString((value as Record<string, unknown>)[key]);
}

function toCompanyView(data: Record<string, unknown>): CompanyView {
  return {
    name: asString(data.name),
    legalName: asString(data.legalName),
    taxId: asString(data.taxId),
    phone: asString(data.phone),
    primaryContactEmail: asString(data.primaryContactEmail),
    address: formatAddress(data.address),
    locale: brandingValue(data.branding, "locale"),
    timezone: brandingValue(data.branding, "timezone"),
  };
}

function companyErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para consultar la empresa.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  return "No se pudo cargar la empresa.";
}

function logoutErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "auth/network-request-failed") {
    return "No hay conexión. Revisa tu red e inténtalo de nuevo.";
  }

  return "No se pudo cerrar la sesión. Inténtalo de nuevo.";
}

export function ConfiguracionScreen() {
  const router = useRouter();
  const session = useAuthSession();
  const [company, setCompany] = useState<CompanyLoad>({ status: "loading" });
  const [detail, setDetail] = useState<Detail>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    const userId = session.user.uid;
    let cancelled = false;

    resolveActiveCompanyId(userId)
      .then(async (companyId) => {
        if (!companyId) {
          return { status: "no-company" } as const;
        }

        const snapshot = await getDoc(doc(getFirebaseFirestore(), "companies", companyId));

        if (!snapshot.exists()) {
          return { status: "missing" } as const;
        }

        return { status: "ready", company: toCompanyView(snapshot.data()) } as const;
      })
      .then((result) => {
        if (!cancelled) {
          setCompany(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCompany({ status: "error", message: companyErrorMessage(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function confirmSignOut() {
    if (signingOut) {
      return;
    }

    setLogoutError(null);
    setSigningOut(true);

    try {
      await signOutUser();
      router.replace("/login");
    } catch (error) {
      setLogoutError(logoutErrorMessage(error));
      setSigningOut(false);
    }
  }

  if (session.status === "loading") {
    return <StatusText>Comprobando sesión</StatusText>;
  }

  if (session.status !== "authenticated") {
    return <StatusText>No hay una sesión activa.</StatusText>;
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-nexo-deep sm:text-4xl">
        Configuración
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-muted">
        Cuenta, ayuda y cierre de sesión.
      </p>

      <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5">
        <CompanyCard load={company} />

        {detail === "ayuda" ? (
          <DetailCard title="Ayuda" text="Guía rápida" onBack={() => setDetail(null)}>
            <p className="text-sm leading-6 text-muted">{aboutDescription}</p>
          </DetailCard>
        ) : null}

        {detail === "acerca" ? (
          <DetailCard title="Acerca de" text="Información de NexoGo" onBack={() => setDetail(null)}>
            <p className="text-sm font-semibold text-nexo-deep">{brand.name}</p>
            <p className="mt-1 text-sm text-muted">{brand.slogan}</p>
            <p className="mt-4 text-sm leading-6 text-muted">{aboutDescription}</p>
          </DetailCard>
        ) : null}

        {detail === null ? (
          <>
            <Section icon="user" title="Cuenta">
              <ActionRow
                href="/app/perfil"
                title="Mi perfil"
                text="Datos de la cuenta"
              />
            </Section>

            <Section icon="settings" title="Ayuda">
              <ActionRow title="Ayuda" text="Guía rápida" onClick={() => setDetail("ayuda")} />
              <ActionRow
                title="Acerca de"
                text="Información de NexoGo"
                onClick={() => setDetail("acerca")}
              />
            </Section>

            <Section icon="lock" title="Sesión">
              <ActionRow
                title="Cerrar sesión"
                text="Salir de NexoGo"
                onClick={() => {
                  setLogoutError(null);
                  setConfirmLogout(true);
                }}
              />
              {logoutError ? (
                <p role="alert" className="py-4 text-sm leading-6 text-red-700">
                  {logoutError}
                </p>
              ) : null}
            </Section>
          </>
        ) : null}
      </div>

      {confirmLogout ? (
        <LogoutDialog
          signingOut={signingOut}
          onCancel={() => {
            if (!signingOut) {
              setConfirmLogout(false);
            }
          }}
          onConfirm={() => {
            void confirmSignOut();
          }}
        />
      ) : null}
    </section>
  );
}

function CompanyCard({ load }: { load: CompanyLoad }) {
  return (
    <article className={cardClass}>
      <div className="flex gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-nexo-blue">
          <Icon name="building" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-nexo-deep">Empresa activa</h2>
        </div>
      </div>
      <div className="mt-4 border-t border-line">
        {load.status === "loading" ? <StatusText>Cargando empresa</StatusText> : null}
        {load.status === "no-company" ? (
          <p className="py-4 text-sm leading-6 text-muted">No hay una empresa activa.</p>
        ) : null}
        {load.status === "missing" ? (
          <p className="py-4 text-sm leading-6 text-muted">No se encontró la empresa.</p>
        ) : null}
        {load.status === "error" ? (
          <p role="alert" className="py-4 text-sm leading-6 text-red-700">
            {load.message}
          </p>
        ) : null}
        {load.status === "ready" ? <CompanyFacts company={load.company} /> : null}
      </div>
    </article>
  );
}

function CompanyFacts({ company }: { company: CompanyView }) {
  const facts = [
    { label: "Empresa activa", value: company.name },
    { label: "Razón social", value: company.legalName },
    { label: "Identificación tributaria", value: company.taxId },
    { label: "Email", value: company.primaryContactEmail },
    { label: "Teléfono", value: company.phone },
    { label: "Dirección", value: company.address },
    { label: "Idioma", value: company.locale },
    { label: "Zona horaria", value: company.timezone },
  ].filter((fact) => fact.value.length > 0);

  if (facts.length === 0) {
    return (
      <p className="py-4 text-sm leading-6 text-muted">
        Esta empresa no tiene datos de contacto registrados.
      </p>
    );
  }

  return (
    <dl>
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex flex-col gap-1 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <dt className="text-sm font-medium text-nexo-deep">{fact.label}</dt>
          <dd className="text-sm text-muted sm:text-right">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <div className="flex gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-nexo-blue">
          <Icon name={icon} />
        </span>
        <h2 className="self-center text-lg font-semibold text-nexo-deep">{title}</h2>
      </div>
      <div className="mt-4 border-t border-line">{children}</div>
    </article>
  );
}

function ActionRow({
  title,
  text,
  href,
  onClick,
}: {
  title: string;
  text: string;
  href?: "/app/perfil";
  onClick?: () => void;
}) {
  const className =
    "flex w-full items-center justify-between gap-4 border-b border-line py-4 text-left last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";
  const body = (
    <>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-nexo-deep">{title}</span>
        <span className="mt-1 block text-sm text-muted">{text}</span>
      </span>
      <span aria-hidden="true" className="text-sm text-slate-400">
        →
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}

function DetailCard({
  title,
  text,
  onBack,
  children,
}: {
  title: string;
  text: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-nexo-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
      >
        Volver
      </button>
      <h2 className="mt-4 text-lg font-semibold text-nexo-deep">{title}</h2>
      <p className="mt-1 text-sm text-muted">{text}</p>
      <div className="mt-4 border-t border-line pt-4">{children}</div>
    </article>
  );
}

function LogoutDialog({
  signingOut,
  onCancel,
  onConfirm,
}: {
  signingOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !signingOut) {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, signingOut]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center">
      <button
        type="button"
        className="absolute inset-0 bg-nexo-deep/40"
        aria-label="Cerrar"
        onClick={onCancel}
        disabled={signingOut}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-[0_24px_60px_-28px_rgba(10,35,66,0.55)] sm:p-6"
      >
        <h2 id={titleId} className="text-xl font-semibold text-nexo-deep">
          Cerrar sesión
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">¿Seguro que deseas salir?</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={secondaryButtonClass} onClick={onCancel} disabled={signingOut}>
            Cancelar
          </button>
          <button type="button" className={primaryButtonClass} onClick={onConfirm} disabled={signingOut}>
            {signingOut ? "Cerrando sesión" : "Salir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusText({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-4 text-sm font-medium text-muted" role="status">
      {children}
    </p>
  );
}
