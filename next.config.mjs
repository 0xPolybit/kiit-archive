/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The PYQ route streams PDFs/JPGs off disk from pyqs/, which lives
  // outside the Next.js bundle. Tell the standalone tracer to keep the
  // directory so `next start` and containerised deploys can still read it.
  outputFileTracingIncludes: {
    "/pyqs/**": ["./pyqs/**"],
  },
};

export default nextConfig;
