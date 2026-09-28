import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { sectors } from "@/lib/site";

const base = ["Clientes", "Expedientes", "Documentos"];

export function Sectors() {
  return (
    <section id="soluciones" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Ejemplos de organizaciones"
          title="Una misma base. Diferentes formas de trabajar."
          description="La organización de la información cambia según cada empresa. NexoGo parte de una estructura común que puede adaptarse a distintos contextos."
        />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => (
            <li key={sector.name}>
              <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-[0_16px_40px_-32px_rgba(10,35,66,0.7)]">
                <h3 className="text-lg font-semibold text-nexo-deep">{sector.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">{sector.text}</p>
                <ol className="mt-5 flex flex-wrap items-center gap-1.5">
                  {base.map((item, index) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <span className="rounded-full bg-[#f3f6fb] px-2.5 py-1 text-[11px] font-medium text-nexo-deep">
                        {item}
                      </span>
                      {index < base.length - 1 ? (
                        <span aria-hidden="true" className="text-nexo-blue">
                          →
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </article>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl text-sm leading-6 text-muted">
          Estos nombres ilustran tipos de empresa. La estructura es la misma;
          NexoGo no incluye módulos específicos para cada sector.
        </p>
      </Container>
    </section>
  );
}
