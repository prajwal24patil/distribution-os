import Link from "next/link";
import { login } from "@/app/actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10">
      <section className="w-full max-w-md rounded border border-neutral-300 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          DistributionOS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Login</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-700">
          Use Supabase email/password authentication to access the dashboard.
        </p>

        {error ? (
          <div className="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form action={login} className="mt-6 flex flex-col gap-4">
          <input name="next" type="hidden" value={next ?? "/"} />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Email</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Password</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>

          <button
            className="h-10 rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            type="submit"
          >
            Login
          </button>
        </form>

        <p className="mt-5 text-sm text-neutral-600">
          No account yet?{" "}
          <Link className="font-semibold text-neutral-950" href="/signup">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
