"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton({ calendarId }: { calendarId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    console.log(`[SyncButton] Starting sync for calendar: ${calendarId}`);
    setIsLoading(true);

    try {
      console.log("[SyncButton] Sending sync request to API...");
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ calendarId }),
      });

      console.log(`[SyncButton] Response status: ${response.status}`);

      const result = await response.json();
      console.log("[SyncButton] Response data:", result);

      if (!response.ok) {
        console.error("[SyncButton] Sync failed:", result);
        throw new Error(result.details || result.error || "Failed to sync");
      }

      // Show detailed result
      if (result.debugInfo) {
        console.log("[SyncButton] Debug info:", result.debugInfo);
      }

      alert(
        `同期完了!\n` +
        `処理したイベント: ${result.eventsProcessed}件\n` +
        `${result.message || ''}`
      );

      router.refresh();
    } catch (error) {
      console.error("[SyncButton] Error during sync:", error);
      alert(
        `同期に失敗しました:\n${error instanceof Error ? error.message : '不明なエラー'}`
      );
    } finally {
      setIsLoading(false);
      console.log("[SyncButton] Sync process completed");
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isLoading}
      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-lg transition-colors"
    >
      {isLoading ? "同期中..." : "今すぐ同期"}
    </button>
  );
}
