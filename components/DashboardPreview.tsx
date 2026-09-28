const sidebar = ["Clientes", "Expedientes", "Documentos", "Usuarios", "Roles"];

const chain = [
  { label: "Cliente", value: "Empresa Central" },
  { label: "Expediente", value: "Expediente administrativo" },
  { label: "Documento", value: "Contrato_2026.pdf" },
  { label: "Acceso", value: "Administrador · Acceso permitido" },
];

export function DashboardPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.16),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(14,165,180,0.18),transparent_50%)]"
      />
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_30px_70px_-36px_rgba(10,35,66,0.55)] ring-1 ring-slate-900/5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-nexo-deep">NexoGo</p>
          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800">
            Vista de ejemplo
          </span>
        </div>

        <div className="grid min-h-[24rem] grid-cols-[5.75rem_1fr] sm:grid-cols-[9.25rem_1fr]">
          <div className="bg-nexo-deep px-2 py-4 text-white sm:px-3">
            <p className="px-2 text-[11px] font-medium tracking-wide text-white/55">
              Operación
            </p>
            <ul className="mt-3 space-y-1">
              {sidebar.map((item) => (
                <li key={item}>
                  <div className="rounded-lg px-2 py-2 text-[11px] text-white/75 sm:text-xs">
                    {item}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#f8fafc] p-3 sm:p-4">
            <p className="text-sm font-semibold text-nexo-deep">Operación conectada</p>
            <p className="mt-1 text-xs text-muted">Representación visual</p>
            <ol className="mt-4">
              {chain.map((step, index) => {
                const isLast = index === chain.length - 1;

                return (
                  <li key={step.label} className="relative flex gap-3 pb-3 last:pb-0">
                    {isLast ? null : (
                      <span
                        aria-hidden="true"
                        className="absolute top-5 bottom-0 left-[7px] w-px bg-nexo-blue/25"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="relative z-10 mt-3 size-3.5 shrink-0 rounded-full bg-white ring-2 ring-nexo-blue"
                    />
                    <div className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 shadow-[0_8px_20px_-18px_rgba(10,35,66,0.9)]">
                      <p className="text-[11px] font-semibold tracking-wide text-nexo-blue uppercase">
                        {step.label}
                      </p>
                      <p className="mt-1 text-sm font-medium break-words text-nexo-deep">
                        {step.value}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm leading-6 text-muted">
        Representación visual de la interfaz. No muestra información real de empresas.
      </figcaption>
    </figure>
  );
}
