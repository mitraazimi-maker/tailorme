import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Bodoni_Moda, Geist_Mono, Inter, Inter_Tight } from "next/font/google";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logout } from "./actions/auth";
import { INTRO } from "@/lib/catalog";
import "./globals.css";

const bodoni = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], weight: ["400", "500"], variable: "--font-bodoni" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-inter-tight" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "tailor me · Your own tailor, from $14", template: "%s · tailor me" },
  description: "Sydney’s neighbourhood tailors for everyday alterations and repairs. Send a photo, get guide quotes from local tailors.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, sampleCount] = await Promise.all([getUser(), db.tailorProfile.count({ where: { isSample: true } })]);
  return (
    <html lang="en-AU" className={`${bodoni.variable} ${interTight.variable} ${inter.variable} ${geistMono.variable}`}>
      <body>
        {sampleCount > 0 && (
          <div className="demo">
            Development data · <b>sample tailors and reviews</b> are illustrative, not real businesses
          </div>
        )}
        <header className="top">
          <div className="wrap nav">
            <Link className="logo" href="/" aria-label="tailor me home">
              <span className="wordmark">tailor <i>me</i></span>
            </Link>
            <nav className="nav-links">
              <Link className="hide-sm" href="/tailors">Find a tailor</Link>
              <Link className="hide-sm" href="/#pricing">Price guide</Link>
              {!user && <Link className="hide-sm" href="/for-tailors">For tailors</Link>}
              {user ? (
                <>
                  <Link href={user.tailor ? "/tailor" : "/jobs"}>{user.tailor ? "Dashboard" : "My jobs"}</Link>
                  {user.role === "ADMIN" && <Link className="hide-sm" href="/admin">Admin</Link>}
                  <form action={logout}><button className="navbtn hide-xs">Log out</button></form>
                </>
              ) : (
                <Link className="hide-xs" href="/login">Log in</Link>
              )}
              {!user?.tailor && (
                <Link className="btn btn-primary btn-sm btn-brand" href="/post" aria-label="Tailor me: get quotes">
                  tailor <i>me</i>
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main id="app">{children}</main>
        <footer>
          <div className="wrap">
            <span style={{ maxWidth: "70ch" }}>
              tailor me · Sydney · Everyday alterations and repairs. {INTRO} Tailors are independent businesses, not employees or agents of tailor me.
            </span>
            <span className="row-wrap">
              <Link href="/for-tailors">For tailors</Link>
              <Link href="/account">Account</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
