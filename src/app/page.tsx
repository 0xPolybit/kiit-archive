import Link from "next/link";

import { Icon } from "@/components/Icon";

const CARDS: [href: string, icon: string, title: string, desc: string][] = [
  [
    "/students",
    "person",
    "Students",
    "Search and filter publicly available data on students.",
  ],
  [
    "/timetable",
    "today",
    "Timetable",
    "Look up any student by roll, name, or section to see their weekly timetable.",
  ],
  ["/pyqs", "archive", "PYQs", "Search and filter publicly available PYQs."],
  [
    "/books",
    "menu_book",
    "Books",
    "Search and filter publicly available books.",
  ],
  [
    "/gpa-calculator",
    "calculate",
    "GPA Calculator",
    "Calculate your class GPA with ease.",
  ],
  [
    "/courses",
    "school",
    "Courses",
    "View the top free courses and certifications students can enroll in.",
  ],
  ["/terms", "list", "Terms", "Terms and conditions for this website."],
];

export default function HomePage() {
  return (
    <>
      <h1>
        Public KIIT Archive<span style={{ color: "var(--accent)" }}>*</span>
      </h1>
      <p className="caption">
        *Unofficial, but all data is provided by public KIIT University
        documents.
      </p>

      <div className="home-grid">
        {CARDS.map(([href, icon, title, desc]) => (
          <Link key={href} className="home-card" href={href}>
            <Icon name={icon} />
            <h3>{title}</h3>
            <p>{desc}</p>
          </Link>
        ))}
      </div>

      <p style={{ marginTop: 32 }}>
        <a
          className="btn secondary"
          href="https://github.com/0xPolybit"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="code" />
          Who made this?
        </a>
      </p>
    </>
  );
}
