import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { safePyqPath } from "@/lib/pyqs";

/** Serve a PYQ PDF as an attachment. 404s on anything outside pyqs/. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const path = safePyqPath(decodeURIComponent(name), ".pdf");
  if (!path) return new Response("Not found", { status: 404 });

  const file = await readFile(path);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${basename(path)}"`,
    },
  });
}
