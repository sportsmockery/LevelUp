export default function LivePing() {
  return (
    <span className="relative inline-flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-cyan opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-accent-cyan" />
    </span>
  );
}
