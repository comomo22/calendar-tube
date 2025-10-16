import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { supabaseAdmin } from "@/lib/supabase/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

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
            console.error("Error creating user:", error);
            return false;
          }

          userId = newUser.id;
        }

        // Check if this Google account is already linked
        const { data: existingAccount } = await supabaseAdmin
          .from("google_accounts")
          .select("id")
          .eq("google_id", profile.sub)
          .single();

        const tokenExpiresAt = new Date(
          Date.now() + (account.expires_in || 3600) * 1000
        ).toISOString();

        if (existingAccount) {
          // Update existing account with new tokens
          await supabaseAdmin
            .from("google_accounts")
            .update({
              access_token: account.access_token!,
              refresh_token: account.refresh_token || "",
              token_expires_at: tokenExpiresAt,
            })
            .eq("id", existingAccount.id);
        } else {
          // Create new Google account link
          await supabaseAdmin.from("google_accounts").insert({
            user_id: userId,
            google_id: profile.sub,
            email: user.email!,
            name: user.name,
            access_token: account.access_token!,
            refresh_token: account.refresh_token || "",
            token_expires_at: tokenExpiresAt,
          });
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
  },
});
