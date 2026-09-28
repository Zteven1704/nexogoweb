import { Container } from "@/components/Container";
import { Icon, type IconName } from "@/components/Icon";
import { SectionHeading } from "@/components/SectionHeading";
import { features } from "@/lib/site";

const informationTitles = ["Clientes", "Expedientes", "Documentos"];

export function Features() {
  const information = features.filter((feature) =>
    informationTitles.includes(feature.title),
  );
  const access = features.filter(
    (feature) => !informationTitles.includes(feature.title),
  );

  return (
    <section id="funcionalidades" className="scroll-mt-24 bg-white py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Hoy en la plataforma"
          title="Las piezas esenciales de tu gestión."
          description="La información de la operación y el acceso a esa información viven en la misma base."
        />

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
          <div>
            <p className="text-sm font-semibold tracking-wide text-nexo-blue">
              La información
            </p>
            <ul className="mt-4 grid gap-4">
              {information.map((feature) => (
                <li key={feature.title}>
                  <article className="flex h-full gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)] sm:p-6">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-nexo-blue">
                      <Icon name={feature.icon as IconName} />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-nexo-deep">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted">{feature.text}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-nexo-deep p-6 text-white sm:p-7">
            <p className="text-sm font-semibold tracking-wide text-cyan-200">
              El acceso
            </p>
            <ul className="mt-5 divide-y divide-white/10">
              {access.map((feature) => (
                <li key={feature.title} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
