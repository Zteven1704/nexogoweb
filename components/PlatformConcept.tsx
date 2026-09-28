import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { conceptSteps } from "@/lib/site";

export function PlatformConcept() {
  return (
    <section id="plataforma" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="El concepto"
          title="Todo conectado en una sola operación."
          description="Una estructura clara para que la información de tu empresa tenga contexto, responsables y acceso controlado."
        />

        <div className="mt-14 rounded-3xl border border-line bg-white p-5 shadow-[0_24px_60px_-40px_rgba(10,35,66,0.45)] sm:p-8 lg:p-10">
          <ol className="flex flex-col gap-0 xl:flex-row xl:items-stretch">
            {conceptSteps.map((step, index) => {
              const isLast = index === conceptSteps.length - 1;

              return (
                <li
                  key={step.title}
                  className={`relative flex-1 ${isLast ? "" : "pb-10 xl:pr-10 xl:pb-0"}`}
                >
                  <article className="h-full rounded-2xl bg-[#f6f8fc] p-5">
                    <span className="grid size-10 place-items-center rounded-full bg-white text-sm font-semibold text-nexo-blue ring-2 ring-nexo-blue/20">
                      {index + 1}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-nexo-deep">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-pretty text-muted">{step.text}</p>
                  </article>
                  {isLast ? null : (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 text-nexo-blue xl:top-1/2 xl:right-3 xl:bottom-auto xl:left-auto xl:translate-x-0 xl:-translate-y-1/2"
                    >
                      <ArrowDown className="xl:hidden" />
                      <ArrowRight className="hidden xl:block" />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
