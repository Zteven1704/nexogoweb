import type { Metadata } from "next";
import { UsuariosScreen } from "./UsuariosScreen";

export const metadata: Metadata = {
  title: "Usuarios",
};

export default function UsuariosPage() {
  return <UsuariosScreen />;
}
