/**
 * エラーハンドリングユーティリティ
 * Google APIエラーを適切に処理し、リトライロジックを提供
 */

import { GaxiosError } from "gaxios";

/**
 * エラーの種別
 */
export enum ErrorType {
  RATE_LIMIT = "RATE_LIMIT",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN = "UNKNOWN",
}

/**
 * カスタムエラークラス
 */
export class CalendarTubeError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode?: number,
    public originalError?: Error,
    public retryable: boolean = false,
    public retryAfterMs?: number
  ) {
    super(message);
    this.name = "CalendarTubeError";
  }
}

/**
 * Google APIエラーを解析
 */
export function analyzeGoogleApiError(error: unknown): CalendarTubeError {
  if (error instanceof GaxiosError) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.message;

    switch (status) {
      case 401:
        return new CalendarTubeError(
          "Authentication failed. Token may have expired.",
          ErrorType.UNAUTHORIZED,
          401,
          error as Error,
          true // リトライ可能（トークンリフレッシュ後）
        );

      case 403:
        // 権限エラーまたはクォータ超過
        const quotaExceeded = message?.toLowerCase().includes("quota");
        const rateLimited = message?.toLowerCase().includes("rate");

        if (quotaExceeded || rateLimited) {
          // Retry-Afterヘッダーをチェック
          const headers = error.response?.headers;
          const retryAfterStr = headers?.get ? headers.get("retry-after") :
                               headers ? (headers as any)["retry-after"] : undefined;
          const retryAfterMs = retryAfterStr
            ? parseInt(retryAfterStr) * 1000
            : 60000; // デフォルト60秒

          return new CalendarTubeError(
            "API rate limit exceeded. Please try again later.",
            ErrorType.RATE_LIMIT,
            403,
            error as Error,
            true,
            retryAfterMs
          );
        }

        return new CalendarTubeError(
          "Access denied. Check permissions for Google Calendar API.",
          ErrorType.FORBIDDEN,
          403,
          error as Error,
          false
        );

      case 404:
        return new CalendarTubeError(
          "Resource not found. Calendar or event may have been deleted.",
          ErrorType.NOT_FOUND,
          404,
          error as Error,
          false
        );

      case 429:
        // Too Many Requests
        const headers429 = error.response?.headers;
        const retryAfter429 = headers429?.get ? headers429.get("retry-after") :
                             headers429 ? (headers429 as any)["retry-after"] : undefined;
        const retryAfterMs = retryAfter429
          ? parseInt(retryAfter429) * 1000
          : 10000; // デフォルト10秒

        return new CalendarTubeError(
          "Too many requests. Please slow down.",
          ErrorType.RATE_LIMIT,
          429,
          error as Error,
          true,
          retryAfterMs
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new CalendarTubeError(
          "Google Calendar service is temporarily unavailable.",
          ErrorType.SERVER_ERROR,
          status,
          error as Error,
          true,
          5000 // 5秒後にリトライ
        );

      default:
        return new CalendarTubeError(
          `Google API error: ${message}`,
          ErrorType.UNKNOWN,
          status,
          error as Error,
          status ? status >= 500 : false
        );
    }
  }

  // ネットワークエラー
  if (error instanceof Error) {
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ENOTFOUND")
    ) {
      return new CalendarTubeError(
        "Network error. Please check your connection.",
        ErrorType.NETWORK_ERROR,
        undefined,
        error,
        true,
        3000 // 3秒後にリトライ
      );
    }
  }

  // その他のエラー
  return new CalendarTubeError(
    error instanceof Error ? error.message : String(error),
    ErrorType.UNKNOWN,
    undefined,
    error instanceof Error ? error : undefined,
    false
  );
}

/**
 * リトライロジック
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (error: CalendarTubeError, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: CalendarTubeError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = analyzeGoogleApiError(error);

      // リトライ不可能なエラーの場合は即座に失敗
      if (!lastError.retryable) {
        throw lastError;
      }

      // 最後の試行の場合は失敗
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // リトライ前のコールバック
      if (onRetry) {
        onRetry(lastError, attempt);
      }

      // 待機時間の計算
      let delayMs: number;

      if (lastError.retryAfterMs) {
        // サーバーが指定した待機時間を使用
        delayMs = lastError.retryAfterMs;
      } else {
        // 指数バックオフ
        delayMs = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );
      }

      console.log(
        `[Retry] Attempt ${attempt}/${maxAttempts} failed. Retrying after ${delayMs}ms...`
      );

      await sleep(delayMs);
    }
  }

  throw lastError || new Error("Retry failed");
}

/**
 * スリープユーティリティ
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * エラーレスポンスの生成
 */
export function createErrorResponse(error: unknown): {
  error: string;
  type: ErrorType;
  details?: string;
  retryable: boolean;
  retryAfterMs?: number;
} {
  const calendarError = analyzeGoogleApiError(error);

  return {
    error: calendarError.message,
    type: calendarError.type,
    details: calendarError.originalError?.message,
    retryable: calendarError.retryable,
    retryAfterMs: calendarError.retryAfterMs,
  };
}

/**
 * バッチ処理エラーハンドラー
 */
export async function handleBatchErrors<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    continueOnError?: boolean;
    onError?: (item: T, error: CalendarTubeError) => void;
  } = {}
): Promise<{
  successful: Array<{ item: T; result: R }>;
  failed: Array<{ item: T; error: CalendarTubeError }>;
}> {
  const {
    batchSize = 5,
    continueOnError = true,
    onError,
  } = options;

  const successful: Array<{ item: T; result: R }> = [];
  const failed: Array<{ item: T; error: CalendarTubeError }> = [];

  // バッチごとに処理
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const result = await processor(item);
          return { item, result };
        } catch (error) {
          const calendarError = analyzeGoogleApiError(error);

          if (onError) {
            onError(item, calendarError);
          }

          if (!continueOnError) {
            throw calendarError;
          }

          return { item, error: calendarError };
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const value = result.value;
        if ("error" in value) {
          failed.push(value as { item: T; error: CalendarTubeError });
        } else {
          successful.push(value as { item: T; result: R });
        }
      } else {
        // Promise.allSettledでrejectedになることはないはずだが、念のため
        const error = analyzeGoogleApiError(result.reason);
        if (!continueOnError) {
          throw error;
        }
      }
    }

    // レート制限対策: バッチ間に少し待機
    if (i + batchSize < items.length) {
      await sleep(500);
    }
  }

  return { successful, failed };
}