import type { Metadata } from "next";
import "./globals.css";
import { NotificationProvider } from "@/app/providers/NotificationProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { ToastContainer } from "@/app/components/ToastNotification";

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
      <body className="font-body-local">
        <ThemeProvider>
          <NotificationProvider>
            <ToastContainer />
            {children}
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
