type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
};

const variants = {
  primary:
    "bg-nexo-deep text-white shadow-sm hover:bg-[#16345c] focus-visible:outline-nexo-blue",
  secondary:
    "border border-line bg-white text-nexo-deep hover:bg-slate-50 focus-visible:outline-nexo-blue",
} as const;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  onClick,
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
