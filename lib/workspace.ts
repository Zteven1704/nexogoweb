import type { IconName } from "@/components/Icon";

export const workspaceNav: readonly {
  label: string;
  icon: IconName;
  href?:
    | "/app"
    | "/app/clientes"
    | "/app/expedientes"
    | "/app/documentos"
    | "/app/usuarios"
    | "/app/configuracion";
}[] = [
  { label: "Inicio", icon: "home", href: "/app" },
  { label: "Clientes", icon: "users", href: "/app/clientes" },
  { label: "Expedientes", icon: "folder", href: "/app/expedientes" },
  { label: "Documentos", icon: "file", href: "/app/documentos" },
  { label: "Usuarios", icon: "user", href: "/app/usuarios" },
  { label: "Configuración", icon: "settings", href: "/app/configuracion" },
];

export const dashboardCardTitles = ["Clientes", "Expedientes", "Documentos", "Usuarios"] as const;
