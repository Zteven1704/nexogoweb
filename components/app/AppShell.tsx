"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { getAuthErrorMessage, signOutUser } from "@/lib/auth";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const session = useAuthSession();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [router, session.status]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");

    function onChange() {
      if (media.matches) {
        setMenuOpen(false);
      }
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function onSignOut() {
    setError(null);
    setSigningOut(true);

    try {
      await signOutUser();
      router.replace("/login");
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
      setSigningOut(false);
    }
  }

  if (session.status === "error") {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <p role="alert" className="max-w-md text-center text-sm leading-6 text-red-700">
          {session.message}
        </p>
      </main>
    );
  }

  if (session.status !== "authenticated") {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <p className="text-sm font-medium text-muted" role="status">
          Comprobando sesión
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh lg:block">
        <AppSidebar className="h-dvh" />
      </aside>
      <div id={menuId} hidden={!menuOpen} className="fixed inset-0 z-40 lg:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-nexo-deep/40"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
        <div className="relative h-full w-[min(100%,17rem)] shadow-xl">
          <AppSidebar className="h-full" onNavigate={() => setMenuOpen(false)} />
        </div>
      </div>
      <div className="min-w-0">
        <AppHeader
          email={session.user.email}
          signingOut={signingOut}
          onSignOut={onSignOut}
          onOpenMenu={() => setMenuOpen(true)}
          menuOpen={menuOpen}
          menuId={menuId}
        />
        {error ? (
          <p role="alert" className="px-4 pt-4 text-sm leading-6 text-red-700 sm:px-6">
            {error}
          </p>
        ) : null}
        <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">{children}</div>
      </div>
    </div>
  );
}
