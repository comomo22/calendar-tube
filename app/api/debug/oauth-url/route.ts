import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  // Create OAuth URL manually to test
  const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `${baseUrl}?${params.toString()}`;

  return NextResponse.json({
    debug: {
      clientIdFirstChars: clientId.substring(0, 10),
      clientIdLastChars: clientId.substring(clientId.length - 10),
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
      redirectUri,
      authUrl,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    },
  });
}