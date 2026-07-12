import { cookies } from "next/headers";
import Link from "next/link";

import { toggleCombine } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { stats, timetable, todayName } from "@/lib/data";
import { COMBINE_COOKIE } from "@/lib/prefs";
import { search, sectionViews, type Match } from "@/lib/timetable";
import type { Slot } from "@/lib/types";

export const metadata = { title: "Timetable · KIIT Archive" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const fmt = (n: number) => n.toLocaleString("en-US");

function SlotCell({ slot }: { slot: Slot }) {
  return (
    <>
      <div className="slot-course">{slot.c}</div>
      {slot.f && <div className="slot-faculty">{slot.f}</div>}
      {slot.r && <div className="slot-room">{slot.r}</div>}
    </>
  );
}

function DayHeader({ days, today }: { days: string[]; today: string }) {
  return (
    <thead>
      <tr>
        <th>Period</th>
        {days.map((day) => (
          <th key={day} className={day === today ? "today" : ""}>
            {day}
            {day === today && <span className="today-pill">Today</span>}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** One table per section: Core, PE1, PE2. */
function SplitView({ match, today }: { match: Match; today: string }) {
  const { days, periods } = timetable;

  return (
    <div className="timetable-grid">
      {sectionViews(match).map((view) => (
        <div key={view.slug} className="panel timetable-panel">
          <h3>
            {view.label}
            {view.code ? (
              <span className="section-pill">{view.code}</span>
            ) : (
              <span className="muted-text">— not assigned</span>
            )}
          </h3>

          {view.code && Object.keys(view.schedule).length > 0 ? (
            <div className="table-wrap">
              <table className="data timetable">
                <DayHeader days={days} today={today} />
                <tbody>
                  {periods.map((period, i) => (
                    <tr key={period.label}>
                      <th className="period">
                        {period.label}
                        <br />
                        <span className="muted-text">{period.time}</span>
                      </th>
                      {days.map((day) => {
                        const slot = view.schedule[day]?.[i] ?? null;
                        return (
                          <td
                            key={day}
                            className={[
                              day === today ? "today" : "",
                              slot ? "" : "empty",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {slot && <SlotCell slot={slot} />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "24px 8px" }}>
              <Icon name="event_busy" />
              <p>No schedule found for this section.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** A single table with Core/PE1/PE2 stacked inside each cell. */
function CombinedView({ match, today }: { match: Match; today: string }) {
  const { days, periods } = timetable;
  const views = sectionViews(match).filter((v) => v.code);

  return (
    <div className="panel timetable-panel combined-panel">
      <h3>
        Combined weekly timetable
        <span className="combined-legend">
          {views.map((v) => (
            <span key={v.slug} className={`legend-pill ${v.slug}`}>
              <span className="legend-tag">{v.label}</span>
              <span className="legend-code">{v.code}</span>
            </span>
          ))}
        </span>
      </h3>

      <div className="table-wrap">
        <table className="data timetable combined">
          <DayHeader days={days} today={today} />
          <tbody>
            {periods.map((period, i) => (
              <tr key={period.label}>
                <th className="period">
                  {period.label}
                  <br />
                  <span className="muted-text">{period.time}</span>
                </th>
                {days.map((day) => (
                  <td key={day} className={day === today ? "today" : ""}>
                    {views.map((v) => {
                      const slot = v.schedule[day]?.[i] ?? null;
                      if (!slot) return null;
                      return (
                        <div
                          key={v.slug}
                          className={`combined-entry ${v.slug}`}
                        >
                          <span className="section-tag">{v.label}</span>
                          <SlotCell slot={slot} />
                        </div>
                      );
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  combine,
  today,
}: {
  match: Match;
  combine: boolean;
  today: string;
}) {
  const s = match.student;
  const a = match.assignment;

  return (
    <div className="match-card" style={{ marginTop: 24 }}>
      <div className="panel">
        <div className="match-head">
          <div>
            <h2 style={{ margin: "0 0 4px" }}>
              {s ? s.name : <span className="muted-text">Unknown student</span>}
            </h2>
            <div className="match-meta">
              <span className="meta-chip">
                <Icon name="id_card" />
                {match.roll}
              </span>
              {s && (
                <>
                  <span className="meta-chip">
                    <Icon name="school" />
                    {s.course}
                  </span>
                  <span className="meta-chip">
                    <Icon name="workspaces" />
                    Scheme {s.scheme} · Batch{" "}
                    {String(s.batch).padStart(2, "0")}
                  </span>
                </>
              )}
              {a.core && (
                <span className="meta-chip accent">
                  <Icon name="bookmark" />
                  Core: {a.core}
                </span>
              )}
              {a.pe1 && (
                <span className="meta-chip accent">
                  <Icon name="bookmark" />
                  PE1: {a.pe1}
                </span>
              )}
              {a.pe2 && (
                <span className="meta-chip accent">
                  <Icon name="bookmark" />
                  PE2: {a.pe2}
                </span>
              )}
              {a.sem3 && (
                <span className="meta-chip muted">
                  <Icon name="history" />
                  3rd Sem: {a.sem3}
                </span>
              )}
              {a.sem4 && (
                <span className="meta-chip muted">
                  <Icon name="history" />
                  4th Sem: {a.sem4}
                </span>
              )}
            </div>
          </div>

          <form action={toggleCombine}>
            <button
              type="submit"
              className={`toggle-pill ${combine ? "on" : ""}`}
              title={`Switch to ${combine ? "split" : "combined"} view`}
            >
              <Icon name={combine ? "view_column_2" : "view_agenda"} />
              <span>{combine ? "Combined view" : "Split view"}</span>
              <span className="toggle-knob" aria-hidden="true">
                <span className="knob-dot" />
              </span>
            </button>
          </form>
        </div>

        {!s && (
          <div
            className="muted-text"
            style={{ fontSize: "0.85rem", marginTop: 8 }}
          >
            This roll is in the 5th-semester schedule but not in the 2024-admitted
            cohort CSV. Course and scheme are unknown.
          </div>
        )}
      </div>

      {/* Collapsed by default: with many matches, the chips above are the
          scannable part — expand only the schedule you actually want. */}
      <details className="timetable-details">
        <summary>
          <span className="summary-closed">
            <Icon name="expand_more" />
            Show weekly timetable
          </span>
          <span className="summary-open">
            <Icon name="expand_less" />
            Hide weekly timetable
          </span>
        </summary>

        {combine ? (
          <CombinedView match={match} today={today} />
        ) : (
          <SplitView match={match} today={today} />
        )}
      </details>
    </div>
  );
}

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const raw = params.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  const store = await cookies();
  const combine = store.get(COMBINE_COOKIE)?.value === "1";

  const { matches, note } = q ? search(q) : { matches: [], note: "" };
  const today = todayName();

  return (
    <>
      <h1>Timetable Lookup</h1>
      <p className="caption">
        Search by <strong>roll number</strong>, <strong>name</strong>, or{" "}
        <strong>section code</strong> (e.g. <code>CS17</code>). Separate multiple
        identifiers with <strong>commas</strong> to look several up at once.
        Today&rsquo;s column is highlighted across every schedule.
      </p>

      <div className="panel">
        <form method="get" action="/timetable">
          <div className="form-row">
            <div className="field">
              <label htmlFor="q">Identifier(s)</label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="2405001, Aaryan, CS17"
                autoFocus
              />
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" className="btn">
              <Icon name="search" />
              Search
            </button>
            <Link className="btn secondary" href="/timetable">
              <Icon name="restart_alt" />
              Reset
            </Link>
          </div>
        </form>
      </div>

      {q && matches.length === 0 && (
        <div className="alert error" style={{ marginTop: 16 }}>
          No students matched &ldquo;<strong>{q}</strong>&rdquo;. Try a different
          roll, name, or section code.
        </div>
      )}

      {note && (
        <div
          className="alert"
          style={{
            marginTop: 16,
            background: "var(--accent-soft)",
            color: "var(--accent)",
            border: "1px solid var(--accent)",
          }}
        >
          {note}
        </div>
      )}

      {matches.map((m, i) => (
        <MatchCard
          key={`${m.roll}-${i}`}
          match={m}
          combine={combine}
          today={today}
        />
      ))}

      {!q && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>What can I search?</h3>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>
              <strong>Roll number</strong> — exact match or prefix (e.g.{" "}
              <code>2405001</code>).
            </li>
            <li>
              <strong>Name</strong> — substring match (e.g. <code>Aaryan</code>).
            </li>
            <li>
              <strong>Section code</strong> — returns every student in that
              section (e.g. <code>CS17</code> for a core section,{" "}
              <code>IPA17</code> for an elective).
            </li>
            <li>
              <strong>Multiple identifiers</strong> — separate with commas (e.g.{" "}
              <code>2405001, Aaryan, CS17</code>).
            </li>
          </ul>
          <p
            className="muted-text"
            style={{ margin: "12px 0 0", fontSize: "0.85rem" }}
          >
            Dataset: {fmt(stats.coreRolls)} core assignments,{" "}
            {fmt(stats.electiveRolls)} elective assignments,{" "}
            {fmt(stats.sectionsInSchedule)} sections.
          </p>
        </div>
      )}
    </>
  );
}
