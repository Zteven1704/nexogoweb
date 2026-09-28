"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ButtonLink } from "@/components/ButtonLink";
import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { infoHref, navLinks } from "@/lib/site";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    function onChange() {
      if (media.matches) {
        setOpen(false);
      }
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/#inicio"
          aria-label="NexoGo, ir al inicio"
          className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
        >
          <Logo />
        </Link>

        <nav aria-label="Secciones" className="hidden items-center gap-5 md:flex lg:gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-label={"pending" in link ? "Contacto, todavía sin canal" : undefined}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-nexo-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nexo-blue"
            >
              {link.label}
              {"pending" in link ? <PendingNote /> : null}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <ButtonLink href={infoHref}>Conocer NexoGo</ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-xl border border-line text-nexo-deep md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </Container>

      <div
        id={menuId}
        hidden={!open}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white md:hidden"
      >
        <Container className="py-4">
          <nav aria-label="Secciones móviles">
            <ul className="flex flex-col">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-label={"pending" in link ? "Contacto, todavía sin canal" : undefined}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-base font-medium text-nexo-deep hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
                    onClick={closeMenu}
                  >
                    {link.label}
                    {"pending" in link ? <PendingNote /> : null}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 px-3 pb-2">
            <ButtonLink href={infoHref} className="w-full" onClick={closeMenu}>
              Conocer NexoGo
            </ButtonLink>
          </div>
        </Container>
      </div>
    </header>
  );
}

function PendingNote() {
  return (
    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
      Pronto
    </span>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}
