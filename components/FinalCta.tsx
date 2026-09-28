import Link from "next/link";
import { Container } from "@/components/Container";

export function FinalCta() {
  return (
    <section id="contacto" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-nexo-deep px-6 py-14 text-center shadow-[0_30px_70px_-40px_rgba(10,35,66,0.8)] sm:px-12 sm:py-16">
          <p className="text-sm font-semibold tracking-wide text-cyan-200">
            Beta en construcción
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Estamos preparando el próximo paso.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
            NexoGo se está construyendo. Esta página presenta la plataforma. El
            canal de contacto todavía no está abierto.
          </p>
          <Link
            href="/#plataforma"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-nexo-deep shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ver la plataforma
          </Link>
        </div>
      </Container>
    </section>
  );
}
