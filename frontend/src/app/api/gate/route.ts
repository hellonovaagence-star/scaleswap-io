import { NextResponse } from "next/server";

const ACCESS_CODE = "718482";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (code !== ACCESS_CODE) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("site-access", "granted", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });

  return response;
}
