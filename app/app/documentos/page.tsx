import type { Metadata } from "next";
import { DocumentosScreen } from "./DocumentosScreen";

export const metadata: Metadata = {
  title: "Documentos",
};

export default function DocumentosPage() {
  return <DocumentosScreen />;
}
