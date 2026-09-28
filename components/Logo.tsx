import Image from "next/image";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/nexogo-logo.png"
        alt=""
        width={478}
        height={299}
        loading="eager"
        className="h-10 w-auto"
      />
      <span className="text-lg font-semibold tracking-tight">
        <span className="text-nexo-deep">Nexo</span>
        <span className="text-nexo-blue">Go</span>
      </span>
    </span>
  );
}
