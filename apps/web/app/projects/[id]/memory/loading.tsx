export default function ProductMemoryLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
      <div className="h-28 animate-pulse rounded border border-neutral-300 bg-white" />
      <div className="h-96 animate-pulse rounded border border-neutral-300 bg-white" />
    </div>
  );
}
