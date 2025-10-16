"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton({ calendarId }: { calendarId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ calendarId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sync");
      }

      const result = await response.json();
      alert(`同期完了: ${result.eventsProcessed}件の予定を処理しました`);
      router.refresh();
    } catch (error) {
      console.error("Error syncing:", error);
      alert(
        error instanceof Error ? error.message : "同期に失敗しました"
      );
    } finally {
      setIsLoading(false);
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
