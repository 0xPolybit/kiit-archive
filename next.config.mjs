import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Pin tracing to this repository rather than an unrelated parent lockfile.
const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The PYQ route streams PDFs/JPGs off disk from pyqs/, which lives
  // outside the Next.js bundle. Tell the standalone tracer to keep the
  // directory so `next start` and containerised deploys can still read it.
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    "/pyqs/**": ["./pyqs/**"],
  },
};

export default nextConfig;
