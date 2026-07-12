import Link from "next/link";

import { Icon } from "@/components/Icon";
import { stats } from "@/lib/data";
import {
  COURSE_CHOICES,
  PAGE_SIZES,
  SCHEME_OPTIONS,
  SORT_KEYS,
  activeChips,
  isFiltered,
  parseQuery,
  runQuery,
  toParams,
  type Query,
} from "@/lib/students";

export const metadata = { title: "Students · KIIT Archive" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const fmt = (n: number) => n.toLocaleString("en-US");

/** Build a /students URL from the current query plus some overrides. */
function href(query: Query, overrides: Partial<Query>): string {
  const p = toParams({ ...query, ...overrides });
  const s = p.toString();
  return s ? `/students?${s}` : "/students";
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const query = parseQuery(await searchParams);
  const filtered = isFiltered(query);
  const chips = activeChips(query);

  // Only actually run a search once something is narrowed; otherwise we'd dump
  // the whole 4,700-row directory on first visit.
  const result = filtered ? runQuery(query) : null;
  const exportHref = `/students/export?${toParams(query).toString()}`;

  return (
    <>
      <h1>Student Archive</h1>
      <p className="caption">
        Data is only available for the <strong>2024-28 admitted cohort</strong>{" "}
        — {fmt(stats.students)} students on record.
      </p>

      <div className="panel">
        <form method="get" action="/students">
          <div className="form-row">
            <div className="field">
              <label htmlFor="course">Course</label>
              <select id="course" name="course" defaultValue={query.course}>
                <option value="Anything">Anything</option>
                {COURSE_CHOICES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="q">Name contains</label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={query.q}
                placeholder="e.g. Aaryan"
              />
            </div>
            <div className="field">
              <label htmlFor="roll">Roll number contains</label>
              <input
                id="roll"
                name="roll"
                type="search"
                defaultValue={query.roll}
                placeholder="e.g. 2405"
              />
            </div>
          </div>

          <div className="form-row three" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="scheme">Scheme</label>
              <select id="scheme" name="scheme" defaultValue={query.scheme}>
                {SCHEME_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "both" ? "Both A & B" : s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="batch">Batch (0 = all)</label>
              <input
                id="batch"
                name="batch"
                type="number"
                min={0}
                max={33}
                step={1}
                defaultValue={query.batch}
              />
            </div>
            <div className="field">
              <label htmlFor="size">Results per page</label>
              <select id="size" name="size" defaultValue={query.size}>
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button type="submit" className="btn">
              <Icon name="search" />
              Search
            </button>
            <Link className="btn secondary" href="/students">
              <Icon name="restart_alt" />
              Reset
            </Link>
            {result && result.total > 0 && (
              <a className="btn ghost" href={exportHref}>
                <Icon name="download" />
                Export {fmt(result.total)} row
                {result.total === 1 ? "" : "s"} as CSV
              </a>
            )}
          </div>
        </form>
      </div>

      {chips.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Active filters</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {chips.map((chip) => (
              <Link
                key={chip.key}
                className="chip"
                title="Remove this filter"
                href={href(query, {
                  [chip.key]: chip.key === "batch" ? 0 : "",
                  page: 1,
                } as Partial<Query>)}
              >
                <span className="chip-label">{chip.label}:</span>
                <span className="chip-value">{chip.value}</span>
                <Icon name="close" className="chip-close" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {!filtered && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="empty-state" style={{ padding: "16px 0" }}>
            <Icon name="filter_alt" className="big" />
            <p>
              Set at least one filter above to search the {fmt(stats.students)}{" "}
              students on record.
            </p>
          </div>
        </div>
      )}

      {result && result.total === 0 && (
        <div className="alert error" style={{ marginTop: 16 }}>
          No students match these filters. Try widening the course or scheme.
        </div>
      )}

      {result && result.total > 0 && (
        <>
          <div className="results-bar">
            <h2>
              {fmt(result.total)} result{result.total === 1 ? "" : "s"}
            </h2>
            <form method="get" action="/students" className="sort-form">
              {/* Preserve the active filters when re-sorting. */}
              {(["course", "q", "roll", "scheme", "batch", "size"] as const).map(
                (k) => (
                  <input key={k} type="hidden" name={k} value={String(query[k])} />
                ),
              )}
              <div
                className="field"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <label htmlFor="sort" style={{ margin: 0 }}>
                  Sort by
                </label>
                <select id="sort" name="sort" defaultValue={query.sort}>
                  {Object.entries(SORT_KEYS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <select id="dir" name="dir" defaultValue={query.dir}>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <button type="submit" className="btn secondary">
                  Apply
                </button>
              </div>
            </form>
          </div>

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Course</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((s, i) => (
                  <tr key={`${s.roll}-${s.section}-${i}`}>
                    <td>{s.roll}</td>
                    <td>{s.name}</td>
                    <td>{s.section}</td>
                    <td>{s.course}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.pages > 1 && (
            <nav className="pagination" aria-label="Results pages">
              {result.page > 1 ? (
                <Link
                  className="page-link"
                  href={href(query, { page: result.page - 1 })}
                >
                  <Icon name="chevron_left" />
                  Prev
                </Link>
              ) : (
                <span className="page-link disabled" aria-disabled="true">
                  <Icon name="chevron_left" />
                  Prev
                </span>
              )}
              <span className="page-info">
                Page {result.page} of {result.pages}
              </span>
              {result.page < result.pages ? (
                <Link
                  className="page-link"
                  href={href(query, { page: result.page + 1 })}
                >
                  Next
                  <Icon name="chevron_right" />
                </Link>
              ) : (
                <span className="page-link disabled" aria-disabled="true">
                  Next
                  <Icon name="chevron_right" />
                </span>
              )}
            </nav>
          )}

          <details className="panel" style={{ marginTop: 16 }}>
            <summary>Results breakdown ({fmt(result.total)} matches)</summary>
            <div className="facet-grid">
              <div>
                <h3>By course</h3>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.facets.course.map(([name, count]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3>By section</h3>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.facets.section.map(([name, count]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </>
      )}
    </>
  );
}
