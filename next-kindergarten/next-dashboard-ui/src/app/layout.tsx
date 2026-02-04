import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from "@/app/providers/NotificationProvider";
import { ToastContainer } from "@/app/components/ToastNotification";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kinder vision",
  description: "Kindergarten Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NotificationProvider>
          <ToastContainer />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
