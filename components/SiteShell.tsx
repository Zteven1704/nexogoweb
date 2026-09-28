import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <a
        href="#contenido"
        className="fixed top-4 left-4 z-[60] -translate-y-24 rounded-full bg-nexo-deep px-4 py-2 text-sm font-medium text-white focus:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}
