import type { Metadata } from "next";
import { PerfilScreen } from "./PerfilScreen";

export const metadata: Metadata = {
  title: "Perfil",
};

export default function PerfilPage() {
  return <PerfilScreen />;
}
