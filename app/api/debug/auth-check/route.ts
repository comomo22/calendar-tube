import { NextResponse } from "next/server";

export async function GET() {
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

  const clientIdLength = process.env.GOOGLE_CLIENT_ID?.length || 0;
  const clientSecretLength = process.env.GOOGLE_CLIENT_SECRET?.length || 0;
  const nextAuthUrl = process.env.NEXTAUTH_URL || "not set";

  return NextResponse.json({
    status: "debug",
    environment: process.env.NODE_ENV,
    checks: {
      hasClientId,
      hasClientSecret,
      hasNextAuthUrl,
      hasNextAuthSecret,
      clientIdLength,
      clientSecretLength,
      nextAuthUrl,
    },
    timestamp: new Date().toISOString(),
  });
}