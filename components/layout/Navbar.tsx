import { siteConfig } from "@/config/site";
import Link from "next/link";

type NavbarProps = {
  size?: "large" | "small";
};

export function Navbar({ size = "large" }: NavbarProps) {
  return (
    <section className="flex items-center justify-between">
      <Link href="/" className="block">
        <h1
          className={`font-bold tracking-tighter leading-tight ${
            size === "large"
              ? "text-6xl md:text-7xl lg:text-8xl my-16 md:mb-12"
              : "text-3xl md:text-4xl my-8 md:mb-4"
          }`}
        >
          {siteConfig.name}
        </h1>
      </Link>
    </section>
  );
}
