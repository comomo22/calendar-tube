"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          認証エラー
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error === "Configuration"
            ? "認証設定にエラーがあります"
            : error === "AccessDenied"
            ? "アクセスが拒否されました"
            : error === "Verification"
            ? "認証トークンの検証に失敗しました"
            : "認証中にエラーが発生しました"}
        </p>
        <a
          href="/auth/signin"
          className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
        >
          ログインページに戻る
        </a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
