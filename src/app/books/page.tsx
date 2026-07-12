import { Icon } from "@/components/Icon";

export const metadata = { title: "Books · KIIT Archive" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const raw = params.query;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  return (
    <>
      <h1>Books Archive</h1>
      <p className="caption">
        We only contain textbooks data since the 2024-25 academic year.
      </p>

      <div className="panel">
        <form method="get" action="/books">
          <div className="form-row">
            <div className="field">
              <label htmlFor="query">Search for books</label>
              <input
                id="query"
                name="query"
                type="search"
                defaultValue={query}
                placeholder="Search by title, author..."
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn">
              <Icon name="search" />
              Search Books
            </button>
          </div>
        </form>
      </div>

      {query && (
        <div className="empty-state">
          <Icon name="menu_book" className="big" />
          <p>Searching for &ldquo;{query}&rdquo;…</p>
          <p style={{ fontSize: "0.85rem" }}>
            The catalog integration is still being prepared.
          </p>
        </div>
      )}
    </>
  );
}
