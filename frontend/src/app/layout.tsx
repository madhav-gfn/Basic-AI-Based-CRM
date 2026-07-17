import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "./components/QueryProvider";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moda CRM — AI-Native D2C Intelligence",
  description: "AI-powered CRM platform for reaching and engaging shoppers across WhatsApp, SMS, Email, and RCS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
