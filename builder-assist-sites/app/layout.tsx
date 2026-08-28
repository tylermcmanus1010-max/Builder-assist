import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Builder Assist LLC",
  description: "Builder Assist construction procurement and project workflow platform.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
