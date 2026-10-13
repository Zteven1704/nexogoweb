import type { Metadata } from "next";
import { DashboardHome } from "@/components/app/DashboardHome";

export const metadata: Metadata = {
  title: "Inicio",
};

export default function WorkspacePage() {
  return <DashboardHome />;
}
