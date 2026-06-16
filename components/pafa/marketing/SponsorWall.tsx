export default function SponsorWall() {
  return (
    <section>
      <h2 className="text-display mb-8 text-center text-4xl">
        {/* COPY: sponsors section heading */}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel-subtle flex aspect-[3/2] items-center justify-center"
          >
            <div data-image-slot="sponsor" aria-hidden="true" className="size-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
