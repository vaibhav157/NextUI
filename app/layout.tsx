import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Admin UI",
  description: "Users and prompt configuration management"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <header className="topNav">
          <nav className="topNavInner" aria-label="Primary">
            <Link href="/" className="navLink">
              Users
            </Link>
            <Link href="/prompt-configs" className="navLink">
              Prompt Configurations
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
