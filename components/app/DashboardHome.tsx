"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SceneFrame } from "@/components/app/DemoMedia";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { Icon } from "@/components/Icon";
import { features } from "@/lib/site";
import { getCompanyUserAccess } from "@/lib/users";
import { dashboardCardTitles, workspaceNav } from "@/lib/workspace";

const cards = dashboardCardTitles.map((title) => {
  const feature = features.find((item) => item.title === title);
  const navItem = workspaceNav.find((item) => item.label === title);

  if (!feature || !navItem?.href) {
    throw new Error(`Falta la tarjeta de ${title}.`);
  }

  return { ...feature, href: navItem.href };
});

const cardClassName =
  "flex h-full gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)] transition hover:border-nexo-blue/25 hover:shadow-[0_22px_48px_-28px_rgba(29,78,216,0.45)] sm:p-6";

export function DashboardHome() {
  const session = useAuthSession();
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    const userId = session.user.uid;
    let cancelled = false;
    getCompanyUserAccess(userId)
      .then((access) => {
        if (!cancelled) {
          setShowUsers(access.canManage);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowUsers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold tracking-wide text-nexo-blue">Inicio</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-balance text-nexo-deep sm:text-4xl">
        Bienvenido a NexoGo
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-muted sm:text-lg sm:leading-8">
        Gestiona la información, documentos y personas de tu empresa desde un solo lugar.
      </p>
      <SceneFrame
        src="/images/demo/oficina-equipo.jpg"
        alt="Equipo profesional revisando documentos en una oficina."
        className="mt-8 h-44 rounded-2xl border border-line shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)] sm:h-56"
        sizes="(min-width: 1024px) 64rem, 100vw"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a2342]/80 via-[#0a2342]/25 to-transparent" />
        <p className="absolute inset-x-0 bottom-0 p-5 text-sm font-medium text-white sm:p-6">
          Espacio de trabajo
        </p>
      </SceneFrame>
      <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
        {cards.map((card) => {
          const canOpen = card.href !== "/app/usuarios" || showUsers;

          return (
            <li key={card.title}>
              {canOpen ? (
                <Link
                  href={card.href}
                  className={`${cardClassName} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue`}
                >
                  <CardBody card={card} />
                </Link>
              ) : (
                <article className={cardClassName}>
                  <CardBody card={card} />
                </article>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CardBody({ card }: { card: (typeof cards)[number] }) {
  return (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-nexo-blue">
        <Icon name={card.icon} />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-nexo-deep">{card.title}</h2>
        <p className="mt-1 text-sm leading-6 text-pretty text-muted">{card.text}</p>
      </div>
    </>
  );
}
