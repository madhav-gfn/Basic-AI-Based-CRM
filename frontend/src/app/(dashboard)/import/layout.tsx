import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI CSV Importer — Saucer AI",
  description: "Upload any CSV file and let AI intelligently extract and map your leads into Saucer AI format.",
};

export default function ImportLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
