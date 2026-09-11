export default function Loading() {
  return (
    <div className="w-full h-full p-8 flex flex-col space-y-6 animate-pulse">
      <div className="h-10 w-1/4 bg-[var(--bg-surface)] rounded-md border border-[var(--border-subtle)]" />
      <div className="flex-1 w-full bg-[var(--bg-surface)] rounded-md border border-[var(--border-subtle)]" />
    </div>
  );
}
