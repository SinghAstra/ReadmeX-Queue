import { siteConfig } from "@/config/site";

export function Navbar() {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
        {siteConfig.name}
      </h1>
    </section>
  );
}
