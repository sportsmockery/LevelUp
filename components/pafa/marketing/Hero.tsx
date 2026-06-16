import Badge from "@/components/pafa/ui/Badge";
import Button from "@/components/pafa/ui/Button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-radial-hero">
      <div className="bg-grid-overlay" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-32 text-center">
        <Badge variant="blue">{/* COPY: eyebrow */}</Badge>
        <h1 className="text-display text-6xl md:text-8xl">
          {/* COPY: hero headline */}
        </h1>
        <p className="max-w-2xl text-lg text-text-secondary">
          {/* COPY: hero sub */}
        </p>
        <div className="flex gap-3">
          <Button variant="primary" size="lg">
            {/* COPY: primary CTA */}
          </Button>
          <Button variant="secondary" size="lg">
            {/* COPY: secondary CTA */}
          </Button>
        </div>
        <div
          data-image-slot="hero-art"
          aria-hidden="true"
          className="glass-panel-strong mt-12 aspect-[16/9] w-full max-w-5xl rounded-2xl"
        />
      </div>
    </section>
  );
}
