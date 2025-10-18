import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { supabaseAdmin } from "@/lib/supabase/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      console.log("[Auth] SignIn callback triggered");

      if (!account || !profile) {
        console.error("[Auth] Missing account or profile data");
        return false;
      }

      // Log important OAuth information
      console.log("[Auth] OAuth Info:", {
        provider: account.provider,
        hasAccessToken: !!account.access_token,
        hasRefreshToken: !!account.refresh_token,
        tokenExpiresIn: account.expires_in,
        scope: account.scope,
      });

      // Verify refresh_token is present for Google
      if (account.provider === "google" && !account.refresh_token) {
        console.warn("[Auth] WARNING: No refresh_token received from Google!");
        console.warn("[Auth] This may cause issues with token renewal.");
        console.warn("[Auth] User may need to re-authenticate with prompt=consent");
      }

      try {
        // Check if user exists
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", user.email!)
          .single();

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          console.log("[Auth] Existing user found:", userId);
        } else {
          // Create new user
          const { data: newUser, error } = await supabaseAdmin
            .from("users")
            .insert({
              email: user.email!,
              name: user.name,
            })
            .select("id")
            .single();

          if (error || !newUser) {
            console.error("[Auth] Error creating user:", error);
            return false;
          }

          userId = newUser.id;
          console.log("[Auth] New user created:", userId);
        }

        // Check if this Google account is already linked
        const { data: existingAccount } = await supabaseAdmin
          .from("google_accounts")
          .select("id, refresh_token")
          .eq("google_id", profile.sub)
          .single();

        const tokenExpiresAt = new Date(
          Date.now() + (account.expires_in || 3600) * 1000
        ).toISOString();

        if (existingAccount) {
          console.log("[Auth] Existing Google account found:", existingAccount.id);

          // Only update refresh_token if we received a new one
          // (Google doesn't always send refresh_token on subsequent logins)
          const updateData: any = {
            access_token: account.access_token!,
            token_expires_at: tokenExpiresAt,
          };

          if (account.refresh_token) {
            updateData.refresh_token = account.refresh_token;
            console.log("[Auth] Updating with new refresh_token");
          } else if (!existingAccount.refresh_token) {
            console.error("[Auth] ERROR: No refresh_token stored and none received!");
            // Force re-consent to get refresh_token
            return false;
          } else {
            console.log("[Auth] Keeping existing refresh_token");
          }

          const { error: updateError } = await supabaseAdmin
            .from("google_accounts")
            .update(updateData)
            .eq("id", existingAccount.id);

          if (updateError) {
            console.error("[Auth] Error updating Google account:", updateError);
            return false;
          }
        } else {
          // Create new Google account link
          if (!account.refresh_token) {
            console.error("[Auth] ERROR: No refresh_token received for new account!");
            console.error("[Auth] User must re-authenticate with prompt=consent");
            return false;
          }

          console.log("[Auth] Creating new Google account link");
          const { error: insertError } = await supabaseAdmin.from("google_accounts").insert({
            user_id: userId,
            google_id: profile.sub,
            email: user.email!,
            name: user.name,
            access_token: account.access_token!,
            refresh_token: account.refresh_token,
            token_expires_at: tokenExpiresAt,
          });

          if (insertError) {
            console.error("[Auth] Error creating Google account:", insertError);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
  },
});
