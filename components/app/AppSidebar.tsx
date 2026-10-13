"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { getCompanyUserAccess } from "@/lib/users";
import { workspaceNav } from "@/lib/workspace";

type AppSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

const primaryNav = workspaceNav.filter((item) => item.label !== "Configuración");
const secondaryNav = workspaceNav.filter((item) => item.label === "Configuración");

export function AppSidebar({ onNavigate, className = "" }: AppSidebarProps) {
  const pathname = usePathname();
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

  const visiblePrimary = primaryNav.filter((item) => item.href !== "/app/usuarios" || showUsers);

  return (
    <div className={`flex h-full flex-col bg-nexo-deep text-white ${className}`}>
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          href="/app"
          aria-label="NexoGo, ir al panel"
          onClick={onNavigate}
          className="inline-flex rounded-xl bg-white px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Logo />
        </Link>
      </div>
      <nav aria-label="Secciones del panel" className="flex flex-1 flex-col px-3 py-4">
        <ul className="space-y-1">
          {visiblePrimary.map((item) => (
            <li key={item.label}>
              <NavItem item={item} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        {secondaryNav.length > 0 ? (
          <ul className="mt-auto space-y-1 border-t border-white/10 pt-4">
            {secondaryNav.map((item) => (
              <li key={item.label}>
                <NavItem item={item} pathname={pathname} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        ) : null}
      </nav>
    </div>
  );
}

function NavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: (typeof workspaceNav)[number];
  pathname: string;
  onNavigate?: () => void;
}) {
  if (item.href) {
    const current = pathname === item.href;

    return (
      <Link
        href={item.href}
        aria-current={current ? "page" : undefined}
        onClick={onNavigate}
        className={
          current
            ? "relative flex min-h-11 items-center gap-3 rounded-xl bg-white/10 px-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            : "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        }
      >
        {current ? (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-300"
          />
        ) : null}
        <Icon
          name={item.icon}
          className={`size-5 shrink-0 ${current ? "text-cyan-200" : "text-white/55"}`}
        />
        {item.label}
      </Link>
    );
  }

  return (
    <span className="flex min-h-11 cursor-default items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.06]">
      <Icon name={item.icon as IconName} className="size-5 shrink-0 text-white/50" />
      <span className="min-w-0 flex-1">{item.label}</span>
      <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cyan-100 uppercase">
        Pronto
      </span>
    </span>
  );
}
