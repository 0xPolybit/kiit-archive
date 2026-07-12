import Link from "next/link";

import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="empty-state">
      <Icon name="search_off" className="big" />
      <h1>Page not found</h1>
      <p>That page doesn&rsquo;t exist in the archive.</p>
      <p style={{ marginTop: 16 }}>
        <Link className="btn" href="/">
          <Icon name="home" />
          Back to home
        </Link>
      </p>
    </div>
  );
}
