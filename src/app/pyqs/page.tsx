import { Icon } from "@/components/Icon";
import {
  CONTRIBUTE_URL,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
  examOptions,
  filesFor,
  findPyq,
  loadSubjects,
} from "@/lib/pyqs";

export const metadata = { title: "PYQs · KIIT Archive" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PyqsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;

  const year = one(params.year) || YEAR_OPTIONS[0];
  const semesterLabel = one(params.semester) || SEMESTER_OPTIONS[0];
  const semester = Number.parseInt(semesterLabel.slice(-1), 10) || 1;
  const exams = examOptions(semester);
  const exam = one(params.exam) || exams[0];

  const subjects = loadSubjects(semester);
  const subject = one(params.subject) || subjects[0] || "";
  const searched = one(params.do) === "1";

  let pdf: string | undefined;
  let pages: string[] = [];
  let credit: string | undefined;
  let missing = false;

  if (searched && subject) {
    const match = findPyq(year, subject, exam, semester);
    if (!match) {
      missing = true;
    } else {
      const found = filesFor(match.file);
      pdf = found.pdf;
      pages = found.pages;
      credit = match.credit ?? "anonymous";
      if (!pdf || pages.length === 0) missing = true;
    }
  }

  const hasResult = searched && !missing && !!pdf;

  return (
    <>
      <h1>PYQs Archive</h1>
      <p className="caption">
        We only contain examination data since the 2024-25 academic year.
      </p>

      <div className="panel">
        <h2>Filters</h2>
        <form method="get" action="/pyqs">
          <div className="form-row three">
            <div className="field">
              <label htmlFor="year">Academic year</label>
              <select id="year" name="year" defaultValue={year}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="semester">Semester</label>
              <select
                id="semester"
                name="semester"
                defaultValue={semesterLabel}
              >
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="exam">Exam</label>
              <select id="exam" name="exam" defaultValue={exam}>
                {exams.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="subject">Subject</label>
              <select id="subject" name="subject" defaultValue={subject}>
                {subjects.length === 0 ? (
                  <option value="">No subjects loaded</option>
                ) : (
                  subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" name="do" value="1" className="btn">
              <Icon name="search" />
              Search for PYQ
            </button>
          </div>
        </form>
      </div>

      {(missing || (searched && subjects.length === 0)) && (
        <>
          <div className="alert error" style={{ marginTop: 16 }}>
            Oops! Looks like we do not have that specific PYQ yet.
          </div>
          <p>
            <a
              className="btn secondary"
              href={CONTRIBUTE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="upload" />
              Contribute
            </a>
          </p>
        </>
      )}

      {hasResult && (
        <>
          <h2>Results</h2>
          <div className="pyq-grid">
            <div>
              {pages.map((page, i) => (
                <figure key={page} className="pyq-page">
                  {/* Served by the /pyqs/image route; these are scans of
                      unknown dimensions, so plain <img> beats next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/pyqs/image/${encodeURIComponent(page)}`}
                    alt={`Page ${i + 1}`}
                  />
                  <figcaption
                    style={{
                      textAlign: "center",
                      fontSize: "0.85rem",
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    Page {i + 1}
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="panel">
              <h3>Download</h3>
              <p>
                <strong>PDF:</strong> {pdf}
              </p>
              <a
                className="btn"
                href={`/pyqs/download/${encodeURIComponent(pdf!)}`}
              >
                <Icon name="download" />
                Download PDF
              </a>
              <h3 style={{ marginTop: 16 }}>Credits</h3>
              <p>
                Shared by <strong>{credit}</strong>.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
