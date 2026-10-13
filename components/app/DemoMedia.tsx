import Image from "next/image";
import { Icon } from "@/components/Icon";

export type PartyId = "andina" | "nova" | "persona";
export type UserVisualId = "admin" | "gestor" | "consulta";
export type DocumentVisualType = "PDF" | "Word" | "Excel";
export type ExpedienteVisual = "administrativo" | "comercial" | "demo";

const partySrc: Record<Exclude<PartyId, "persona">, string> = {
  andina: "/images/demo/logo-andina.svg",
  nova: "/images/demo/logo-nova.svg",
};

const portraitSrc: Record<UserVisualId | "persona", string> = {
  admin: "/images/demo/avatar-admin.jpg",
  gestor: "/images/demo/avatar-gestor.jpg",
  consulta: "/images/demo/avatar-usuario.jpg",
  persona: "/images/demo/avatar-cliente.jpg",
};

export function partyForName(name: string): PartyId {
  if (name === "Empresa Andina S.A.S.") return "andina";
  if (name === "Comercial Nova") return "nova";
  return "persona";
}

function MarkFrame({
  src,
  rounded,
  size,
}: {
  src: string;
  rounded: "full" | "xl";
  size: "sm" | "md";
}) {
  const dimension = size === "sm" ? "size-8" : "size-10";
  const radius = rounded === "full" ? "rounded-full" : "rounded-xl";

  return (
    <span
      className={`relative block shrink-0 overflow-hidden border border-line bg-white shadow-[0_8px_18px_-14px_rgba(10,35,66,0.9)] ${dimension} ${radius}`}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={size === "sm" ? "32px" : "40px"}
        className="object-cover"
        unoptimized={src.endsWith(".svg")}
      />
    </span>
  );
}

export function PartyMark({ party, size = "md" }: { party: PartyId; size?: "sm" | "md" }) {
  if (party === "persona") {
    return <MarkFrame src={portraitSrc.persona} rounded="full" size={size} />;
  }

  return <MarkFrame src={partySrc[party]} rounded="xl" size={size} />;
}

export function UserAvatar({ id, size = "md" }: { id: UserVisualId; size?: "sm" | "md" }) {
  return <MarkFrame src={portraitSrc[id]} rounded="full" size={size} />;
}

export function DocumentGlyph({ type }: { type: DocumentVisualType }) {
  const band =
    type === "PDF" ? "bg-nexo-deep" : type === "Word" ? "bg-nexo-cyan" : "bg-[#0f766e]";
  const label = type === "PDF" ? "PDF" : type === "Word" ? "DOC" : "XLS";

  return (
    <span
      className="relative grid size-10 shrink-0 overflow-hidden rounded-lg border border-line bg-white shadow-[0_8px_18px_-14px_rgba(10,35,66,0.9)]"
      aria-hidden="true"
    >
      <span
        className="absolute top-0 right-0 size-3 bg-slate-100"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
      />
      <span
        className={`absolute inset-x-0 bottom-0 py-1 text-center text-[9px] font-bold tracking-wide text-white ${band}`}
      >
        {label}
      </span>
    </span>
  );
}

const expedienteTone: Record<ExpedienteVisual, { tile: string; bar: string }> = {
  administrativo: { tile: "bg-blue-50 text-nexo-blue", bar: "bg-nexo-blue" },
  comercial: { tile: "bg-cyan-50 text-nexo-cyan", bar: "bg-nexo-cyan" },
  demo: { tile: "bg-slate-100 text-nexo-deep", bar: "bg-slate-400" },
};

export function ExpedienteMark({ tone }: { tone: ExpedienteVisual }) {
  const style = expedienteTone[tone];

  return (
    <span
      className={`relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-line ${style.tile}`}
      aria-hidden="true"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${style.bar}`} />
      <Icon name="folder" />
    </span>
  );
}

export function WorkspaceMark() {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 15.5 11 12l2.2 2.2L16 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function SceneFrame({
  src,
  alt,
  className = "h-32",
  sizes = "(min-width: 1024px) 280px, 100vw",
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      {children}
    </div>
  );
}
