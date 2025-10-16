"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddCalendarButton({ googleAccountId }: { googleAccountId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAddCalendar = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/calendars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ googleAccountId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add calendar");
      }

      router.refresh();
    } catch (error) {
      console.error("Error adding calendar:", error);
      alert(
        error instanceof Error ? error.message : "カレンダーの追加に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddCalendar}
      disabled={isLoading}
      className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
    >
      {isLoading ? "追加中..." : "カレンダーを同期対象に追加"}
    </button>
  );
}
