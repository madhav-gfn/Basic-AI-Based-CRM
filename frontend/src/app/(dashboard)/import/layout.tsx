import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI CSV Importer — Moda CRM",
  description: "Upload any CSV file and let AI intelligently extract and map your leads into Moda CRM format.",
};

export default function ImportLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
