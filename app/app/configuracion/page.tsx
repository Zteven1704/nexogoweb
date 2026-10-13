import type { Metadata } from "next";
import { ConfiguracionScreen } from "./ConfiguracionScreen";

export const metadata: Metadata = {
  title: "Configuración",
};

export default function ConfiguracionPage() {
  return <ConfiguracionScreen />;
}
