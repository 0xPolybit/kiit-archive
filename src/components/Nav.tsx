"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { toggleTheme } from "@/app/actions";
import type { Theme } from "@/lib/prefs";
import { Icon } from "./Icon";

const LINKS: [href: string, icon: string, label: string][] = [
  ["/students", "person", "Students"],
  ["/timetable", "today", "Timetable"],
  ["/pyqs", "archive", "PYQs"],
  ["/books", "menu_book", "Books"],
  ["/gpa-calculator", "calculate", "GPA Calc"],
  ["/courses", "school", "Courses"],
  ["/terms", "list", "Terms"],
];

export function Nav({ theme }: { theme: Theme }) {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <Icon name="archive" />
        <span>KIIT Archive</span>
      </Link>

      <nav className="nav">
        {LINKS.map(([href, icon, label]) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        ))}

        <form action={toggleTheme} className="theme-toggle">
          <button
            type="submit"
            className="nav-link theme-btn"
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            aria-label="Toggle theme"
          >
            <Icon name={theme === "light" ? "dark_mode" : "light_mode"} />
          </button>
        </form>
      </nav>
    </header>
  );
}
