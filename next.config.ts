import type { NextConfig } from "next";

/**
 * Sites allowed to show Xpert AI inside an iframe (via /embed.js).
 * Set EMBED_ALLOWED_ORIGINS to your existing website, space-separated, e.g.
 *   EMBED_ALLOWED_ORIGINS="https://ghandharaestate.com https://www.ghandharaestate.com"
 * When empty, only this site itself can frame the chat.
 */
const embedOrigins = (process.env.EMBED_ALLOWED_ORIGINS ?? "")
  .split(/[\s,]+/)
  .filter((o) => /^https?:\/\/[^\s/]+$/.test(o));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${embedOrigins.join(" ")}`.trim() },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // The embed script is loaded by other sites.
      {
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
