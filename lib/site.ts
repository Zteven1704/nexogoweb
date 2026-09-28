export const brand = {
  name: "NexoGo",
  slogan: "Organiza. Gestiona. Conecta.",
  year: 2026,
} as const;

export const infoHref = "/#contacto";

export const navLinks = [
  { href: "/#plataforma", label: "Plataforma" },
  { href: "/#soluciones", label: "Soluciones" },
  { href: "/#seguridad", label: "Seguridad" },
  { href: "/#vision", label: "Visión" },
  { href: "/#contacto", label: "Contacto", pending: true },
] as const;

/**
 * Páginas previstas para la web pública. Todavía no tienen ruta.
 * La landing usa anclas; al crearlas, pueden compartir SiteShell.
 */
export const plannedRoutes = [
  { href: "/contacto", label: "Contacto" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/precios", label: "Precios" },
] as const;

export const conceptSteps = [
  {
    title: "Personas",
    text: "Quién participa en la operación y con qué responsabilidad.",
  },
  {
    title: "Información",
    text: "El contexto que ordena lo que la empresa necesita consultar.",
  },
  {
    title: "Documentos",
    text: "Los archivos importantes, dentro de esa misma estructura.",
  },
  {
    title: "Procesos",
    text: "La forma de organizar el trabajo alrededor de la información.",
  },
  {
    title: "Equipos",
    text: "Colaboración con acceso definido para cada persona.",
  },
] as const;

export const features = [
  {
    title: "Clientes",
    text: "Centraliza la información de las personas y organizaciones con las que trabaja tu empresa.",
    icon: "users",
  },
  {
    title: "Expedientes",
    text: "Relaciona información y documentos dentro de un contexto organizado y fácil de consultar.",
    icon: "folder",
  },
  {
    title: "Documentos",
    text: "Ten los archivos importantes de la empresa disponibles dentro de una estructura centralizada.",
    icon: "file",
  },
  {
    title: "Usuarios",
    text: "Administra quién forma parte de tu organización y qué acceso necesita.",
    icon: "user",
  },
  {
    title: "Roles",
    text: "Define responsabilidades mediante una estructura clara de roles empresariales.",
    icon: "badge",
  },
  {
    title: "Permisos",
    text: "Controla el acceso a la información según las responsabilidades de cada usuario.",
    icon: "lock",
  },
] as const;

export const sectors = [
  {
    name: "Clínicas",
    text: "La misma base reúne clientes, expedientes y documentos de la operación en un solo contexto.",
  },
  {
    name: "Veterinarias",
    text: "Clientes, expedientes y documentos de la atención quedan organizados con esa estructura común.",
  },
  {
    name: "Bodegas",
    text: "La operación usa la misma base para ordenar clientes, expedientes y documentos.",
  },
  {
    name: "Consultorías",
    text: "El trabajo de consultoría se organiza con clientes, expedientes y documentos en la misma base.",
  },
  {
    name: "Talleres",
    text: "Clientes, expedientes y documentos del servicio comparten la misma organización.",
  },
  {
    name: "Empresas B2B",
    text: "Las relaciones entre empresas se apoyan en clientes, expedientes y documentos dentro de la misma base.",
  },
] as const;

export const securityPoints = [
  {
    title: "Control de acceso",
    text: "Cada persona consulta la información que corresponde a su responsabilidad.",
  },
  {
    title: "Separación por empresa",
    text: "La información de cada organización permanece en su propio espacio.",
  },
  {
    title: "Administración del equipo",
    text: "El equipo se organiza dentro de la empresa, con roles y permisos que delimitan el acceso.",
  },
] as const;

export const currentCapabilities = [
  "Clientes",
  "Expedientes",
  "Documentos",
  "Usuarios",
  "Roles",
  "Permisos",
] as const;

export const futureCapabilities = [
  "Procesos",
  "Colaboración",
  "Más capacidades de gestión empresarial",
] as const;
