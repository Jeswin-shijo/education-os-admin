export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-navy-soft border-t-navy" />
      <span className="text-small">{label}</span>
    </div>
  );
}
