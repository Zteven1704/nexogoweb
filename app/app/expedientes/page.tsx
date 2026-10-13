import type { Metadata } from "next";
import { ExpedientesScreen } from "./ExpedientesScreen";

export const metadata: Metadata = {
  title: "Expedientes",
};

export default function ExpedientesPage() {
  return <ExpedientesScreen />;
}
