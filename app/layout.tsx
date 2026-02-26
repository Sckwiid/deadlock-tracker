import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deadlock Tracker",
  description:
    "Tracker Deadlock avec profil joueur, détails de match, économie Souls et statistiques de méta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
