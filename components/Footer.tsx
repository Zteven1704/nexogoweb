import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { brand, navLinks } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <Container className="flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted">{brand.slogan}</p>
        </div>
        <nav aria-label="Pie de página">
          <ul className="flex flex-col gap-2 sm:items-end">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-label={"pending" in link ? "Contacto, todavía sin canal" : undefined}
                  className="inline-flex items-center gap-2 text-sm text-muted hover:text-nexo-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
                >
                  {link.label}
                  {"pending" in link ? (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
                      Pronto
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <div className="border-t border-line">
        <Container className="py-5">
          <p className="text-sm text-muted">© {brand.year} NexoGo</p>
        </Container>
      </div>
    </footer>
  );
}
