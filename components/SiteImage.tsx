import Image from "next/image";

type SiteImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  preload?: boolean;
};

export function SiteImage({
  src,
  alt,
  sizes,
  className = "object-cover",
  preload = false,
}: SiteImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={className}
    />
  );
}
