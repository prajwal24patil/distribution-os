export default function ActionsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
      <div className="h-24 animate-pulse rounded border border-neutral-300 bg-white" />
      <div className="h-96 animate-pulse rounded border border-neutral-300 bg-white" />
    </div>
  );
}

