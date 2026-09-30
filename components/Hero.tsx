import { ButtonLink } from "@/components/ButtonLink";
import { Container } from "@/components/Container";
import { DashboardPreview } from "@/components/DashboardPreview";
import { SiteImage } from "@/components/SiteImage";
import { infoHref } from "@/lib/site";

export function Hero() {
  return (
    <section id="inicio" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div>
          <p className="inline-flex rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-medium text-nexo-blue shadow-sm">
            Plataforma empresarial multisectorial
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-nexo-deep sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            <span className="block">Organiza.</span>
            <span className="block">Gestiona.</span>
            <span className="block bg-gradient-to-r from-nexo-blue to-cyan-600 bg-clip-text text-transparent">
              Conecta.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            NexoGo conecta personas, información, documentos y procesos para
            ayudarte a organizar la operación de tu empresa desde un solo lugar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={infoHref}>Conocer NexoGo</ButtonLink>
            <ButtonLink href="/#plataforma" variant="secondary">
              Conocer la plataforma
            </ButtonLink>
          </div>
        </div>
        <div className="relative overflow-x-clip">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-[0_24px_50px_-32px_rgba(10,35,66,0.55)] ring-1 ring-slate-900/5">
            <SiteImage
              src="/images/hero-tablet.jpg"
              alt="Persona usando una tablet durante una reunión en una oficina moderna."
              sizes="(max-width: 1024px) 100vw, 46vw"
              preload
              className="object-cover object-[center_35%]"
            />
          </div>
          <div className="relative z-10 -mt-10 sm:-mt-16 lg:-mt-20">
            <DashboardPreview />
          </div>
        </div>
      </Container>
    </section>
  );
}
