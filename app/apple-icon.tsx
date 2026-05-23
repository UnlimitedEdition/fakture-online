import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d9488",
          color: "white",
          fontFamily: "system-ui",
          fontWeight: 800,
          letterSpacing: "-0.04em",
        }}
      >
        <div style={{ fontSize: 88, lineHeight: 1 }}>FO</div>
        <div
          style={{
            marginTop: 8,
            width: 60,
            height: 8,
            background: "#f59e0b",
            borderRadius: 4,
          }}
        />
      </div>
    ),
    size,
  );
}
