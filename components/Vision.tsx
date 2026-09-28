import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { currentCapabilities, futureCapabilities } from "@/lib/site";

export function Vision() {
  return (
    <section id="vision" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="En evolución"
          title="Construyendo una nueva forma de organizar la empresa."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-line bg-white p-7 shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)] sm:p-8">
            <p className="text-sm font-semibold tracking-wide text-nexo-blue uppercase">
              Actual
            </p>
            <h3 className="mt-2 text-xl font-semibold text-nexo-deep">
              Disponible en la versión actual
            </h3>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {currentCapabilities.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-line bg-[#f8fafc] px-4 py-3 text-sm font-medium text-nexo-deep"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-dashed border-nexo-blue/35 bg-white/60 p-7 sm:p-8">
            <p className="text-sm font-semibold tracking-wide text-cyan-800 uppercase">
              Futuro
            </p>
            <h3 className="mt-2 text-xl font-semibold text-nexo-deep">
              Dirección de la plataforma
            </h3>
            <ul className="mt-6 space-y-3">
              {futureCapabilities.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-dashed border-line px-4 py-3 text-sm font-medium text-nexo-deep"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-6 text-muted">
              Estas capacidades pertenecen a la visión futura. Todavía no están
              disponibles.
            </p>
          </article>
        </div>
      </Container>
    </section>
  );
}
