import Link from "next/link";

const Homepage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Homepage</h1>

      <Link
        href="/sign-in"
        className="px-6 py-2 rounded-md bg-lamaPurple text-black hover:bg-purple-700 transition"
      >
        Go to Sign In
      </Link>
    </div>
  );
};

export default Homepage;
