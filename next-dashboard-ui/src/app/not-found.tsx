import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#36392b] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#b9bba8]/25 bg-[#fafaeb]/95 p-8 shadow-[0_20px_48px_rgba(54,57,43,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a3d2d]">404 Not Found</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.02em] text-[#36392b]">
          Page not found
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#636656]">
          The page you are looking for does not exist, may have moved, or the URL may be incorrect.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-[#5a685a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4e5c4e]"
          >
            Go to Home
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center rounded-full border border-[#b9bba8]/40 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#36392b] hover:bg-[#f4f5e4]"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
