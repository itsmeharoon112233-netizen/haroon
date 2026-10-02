import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview image generated at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#1e5b4a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#174a3c" />
            <path d="M14 46V31L32 17l18 14v15" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M25 46v-8a7 7 0 0 1 14 0v8" fill="none" stroke="#d3b064" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 40, opacity: 0.85 }}>{siteConfig.companyName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>{siteConfig.assistantName}</div>
          <div style={{ fontSize: 40, color: "#d3b064" }}>{siteConfig.tagline}</div>
        </div>
      </div>
    ),
    size,
  );
}
