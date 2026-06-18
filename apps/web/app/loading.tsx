export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
      <div className="h-28 animate-pulse rounded border border-neutral-300 bg-white" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded border border-neutral-300 bg-white" />
        <div className="h-32 animate-pulse rounded border border-neutral-300 bg-white" />
        <div className="h-32 animate-pulse rounded border border-neutral-300 bg-white" />
      </div>
    </div>
  );
}
