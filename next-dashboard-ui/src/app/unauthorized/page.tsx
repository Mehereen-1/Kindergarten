import Link from 'next/link';

type UnauthorizedPageProps = {
  searchParams?: {
    from?: string;
    reason?: string;
  };
};

export default function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const from = searchParams?.from || '';
  const reason =
    searchParams?.reason ||
    'You are signed in, but your role does not have permission to access this route.';

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#36392b] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#b9bba8]/25 bg-[#fafaeb]/95 p-8 shadow-[0_20px_48px_rgba(54,57,43,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a3d2d]">403 Forbidden</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.02em] text-[#36392b]">Route access denied</h1>
        <p className="mt-4 text-sm leading-6 text-[#636656]">{reason}</p>

        {from ? (
          <p className="mt-3 text-sm text-[#636656]">
            Route:
            <span className="ml-2 inline-block rounded-md bg-[#eeefdd] px-2 py-0.5 font-mono text-xs text-[#36392b]">
              {from}
            </span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center rounded-full bg-[#5a685a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4e5c4e]"
          >
            Go to Sign In
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-[#b9bba8]/40 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#36392b] hover:bg-[#f4f5e4]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
