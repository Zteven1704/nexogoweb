import Link from "next/link";
import { Container } from "@/components/Container";
import { SiteImage } from "@/components/SiteImage";

export function FinalCta() {
  return (
    <section id="contacto" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-nexo-deep shadow-[0_30px_70px_-40px_rgba(10,35,66,0.8)] lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
          <div className="relative h-56 sm:h-72 lg:h-auto lg:min-h-80">
            <SiteImage
              src="/images/cta-colaboracion.jpg"
              alt="Equipo organizando el trabajo en una pared de notas, con portátiles sobre la mesa."
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-[center_40%]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-nexo-deep via-nexo-deep/25 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-nexo-deep/15 lg:to-nexo-deep"
            />
          </div>
          <div className="px-6 py-14 text-center sm:px-12 sm:py-16 lg:flex lg:flex-col lg:justify-center lg:px-10 lg:text-left xl:px-14">
            <p className="text-sm font-semibold tracking-wide text-cyan-200">
              Beta en construcción
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Estamos preparando el próximo paso.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8 lg:mx-0">
              NexoGo se está construyendo. Esta página presenta la plataforma. El
              canal de contacto todavía no está abierto.
            </p>
            <div>
              <Link
                href="/#plataforma"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-nexo-deep shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ver la plataforma
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
