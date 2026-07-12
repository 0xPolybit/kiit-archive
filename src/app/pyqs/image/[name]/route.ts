import { readFile } from "node:fs/promises";

import { safePyqPath } from "@/lib/pyqs";

/** Serve a scanned PYQ page. 404s on anything outside pyqs/. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const path = safePyqPath(decodeURIComponent(name), ".jpg");
  if (!path) return new Response("Not found", { status: 404 });

  const file = await readFile(path);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
