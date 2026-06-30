import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  // Self-contained .next/standalone for Docker runtime
  output: "standalone",

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },

  // Enable Turbopack for both dev and build — avoids SWC native-binary issues
  // on certain Linux/WSL environments.
  turbopack: {},
};

export default withNextIntl(nextConfig);
