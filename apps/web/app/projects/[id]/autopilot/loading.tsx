function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-200 ${className}`} />;
}

export default function AutopilotLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-5 h-8 w-80" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-2xl" />
      </section>
      <section className="rounded border border-neutral-300 bg-white p-5">
        <SkeletonBlock className="h-4 w-52" />
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="h-24" />
          ))}
        </div>
      </section>
      <section className="rounded border border-neutral-300 bg-white p-5">
        <SkeletonBlock className="h-4 w-56" />
        <SkeletonBlock className="mt-5 h-40 w-full" />
      </section>
    </div>
  );
}
