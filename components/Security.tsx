import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { securityPoints } from "@/lib/site";

export function Security() {
  return (
    <section id="seguridad" className="scroll-mt-24 bg-[#e7eef6] py-20 sm:py-28">
      <Container className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <SectionHeading
          eyebrow="Control de acceso"
          title="La información correcta para las personas correctas."
          description="NexoGo separa la información por empresa y define quién puede consultarla."
        />
        <ol className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_20px_50px_-36px_rgba(10,35,66,0.7)]">
          {securityPoints.map((point, index) => (
            <li
              key={point.title}
              className="grid grid-cols-[auto_1fr] gap-4 border-b border-line px-6 py-6 last:border-b-0 sm:gap-6 sm:px-8"
            >
              <span className="pt-0.5 text-sm font-semibold text-nexo-blue">
                0{index + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-nexo-deep">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{point.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
