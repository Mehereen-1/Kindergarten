import Menu from "@/app/components/Menu";
import Navbar from "@/app/components/Navbar";
import NotificationStatusIndicator from "@/app/components/NotificationStatusIndicator";
import Image from "next/image";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex overflow-hidden bg-[#f6f0d8]">
      {/* LEFT */}
      <div className="w-[88px] lg:w-[270px] p-3 lg:p-4 bg-[#fefade] border-r border-[#ddd8b8] shadow-[8px_0_28px_-16px_rgba(58,57,39,0.24)] flex flex-col min-h-0 shrink-0">
        <Link
          href="/dashboard/admin"
          className="flex items-center justify-center lg:justify-start gap-2 rounded-xl p-2 hover:bg-[#ede9c8] transition-colors"
        >
          <Image src="/logo.png" alt="logo" width={32} height={32} />
          <span className="hidden lg:block font-black text-[#4f5838]">Kinder Vision</span>
        </Link>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <Menu />
        </div>
      </div>
      {/* RIGHT */}
      <div className="min-w-0 flex-1 bg-[#fff8e8] overflow-y-auto overflow-x-hidden flex flex-col">
        {/* <NotificationStatusIndicator /> */}
        <Navbar />
        {children}
      </div>
    </div>
  );
}