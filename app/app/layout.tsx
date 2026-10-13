import { AppShell } from "@/components/app/AppShell";

export default function WorkspaceLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
