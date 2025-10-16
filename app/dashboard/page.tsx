import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/client";
import { AddCalendarButton } from "@/components/AddCalendarButton";
import { SyncButton } from "@/components/SyncButton";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  // Get user's Google accounts with calendars
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  const { data: googleAccounts } = await supabaseAdmin
    .from("google_accounts")
    .select("*, calendars(*)")
    .eq("user_id", user?.id || "");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Calendar Tube
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 dark:text-gray-300 mr-4">
                {session.user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              連携中のGoogleアカウント
            </h2>

            {googleAccounts && googleAccounts.length > 0 ? (
              <div className="space-y-4">
                {googleAccounts.map((account: any) => {
                  const hasCalendar = account.calendars && account.calendars.length > 0;
                  return (
                    <div
                      key={account.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {account.name || account.email}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {account.email}
                          </p>
                        </div>
                        <span className="px-3 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
                          連携中
                        </span>
                      </div>

                      {hasCalendar ? (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <p className="font-medium text-gray-700 dark:text-gray-300">
                                {account.calendars[0].calendar_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                最終同期: {account.calendars[0].last_sync_at
                                  ? new Date(account.calendars[0].last_sync_at).toLocaleString('ja-JP')
                                  : '未同期'}
                              </p>
                            </div>
                            <SyncButton calendarId={account.calendars[0].id} />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <AddCalendarButton googleAccountId={account.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  まだアカウントが連携されていません
                </p>
              </div>
            )}

            <div className="mt-6">
              <form
                action={async () => {
                  "use server";
                  const { signIn } = await import("@/auth");
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  + 別のGoogleアカウントを追加
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              同期設定
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              連携したアカウント間で自動的に予定が同期されます。
            </p>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>• 予定の作成・更新・削除を自動検知</p>
              <p>• リアルタイムで他のカレンダーに反映</p>
              <p>• 同期ループを自動的に防止</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
