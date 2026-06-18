"use client";

type ErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded border border-red-200 bg-red-50 p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Something broke</p>
      <h2 className="text-2xl font-semibold text-red-950">The dashboard could not load.</h2>
      <p className="text-sm leading-6 text-red-800">{error.message}</p>
      <button
        className="h-10 w-fit rounded bg-red-900 px-4 text-sm font-semibold text-white"
        type="button"
        onClick={reset}
      >
        Try Again
      </button>
    </div>
  );
}
