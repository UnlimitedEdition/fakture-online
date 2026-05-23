import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  return new ImageResponse(<Icon />, {
    width: 512,
    height: 512,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function Icon() {
  return (
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
      <div style={{ fontSize: 240, lineHeight: 1 }}>FO</div>
      <div
        style={{
          marginTop: 24,
          width: 160,
          height: 22,
          background: "#f59e0b",
          borderRadius: 10,
        }}
      />
    </div>
  );
}
