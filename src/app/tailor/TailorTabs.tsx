import Link from "next/link";

const TABS: [string, string][] = [
  ["/tailor", "Dashboard"],
  ["/tailor/jobs", "Find jobs"],
  ["/tailor/profile", "Profile & prices"],
];

export function TailorTabs({ current }: { current: string }) {
  return (
    <nav className="tabs" aria-label="Tailor dashboard">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === current ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
