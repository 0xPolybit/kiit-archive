import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Nav } from "@/components/Nav";
import { THEME_COOKIE, type Theme } from "@/lib/prefs";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIIT Archive",
  description:
    "Unofficial archive of publicly available KIIT University documents — student directory, timetables, and past-year papers.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the theme on the server so the correct class is in the very first
  // byte of HTML. A client-side toggle would flash the wrong theme first.
  const store = await cookies();
  const theme: Theme =
    store.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className={`theme-${theme}`}>
        <Nav theme={theme} />
        <main className="container">{children}</main>
        <footer className="footer">
          Unofficial. All data sourced from public KIIT University documents.
        </footer>
      </body>
    </html>
  );
}
