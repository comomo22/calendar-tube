/**
 * 環境変数のバリデーション
 * 起動時に必要な環境変数が設定されているかチェック
 */

export interface EnvConfig {
  // NextAuth
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;

  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Webhook/Cron
  WEBHOOK_SECRET?: string;
  CRON_SECRET?: string;

  // Environment
  NODE_ENV?: string;
}

class EnvValidator {
  private config: Partial<EnvConfig> = {};
  private errors: string[] = [];

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    this.config = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    };
  }

  public validate(): { valid: boolean; errors: string[] } {
    this.errors = [];

    // 必須環境変数のチェック
    this.validateRequired("NEXTAUTH_URL", "NextAuth URL");
    this.validateRequired("NEXTAUTH_SECRET", "NextAuth Secret", 32);
    this.validateRequired("GOOGLE_CLIENT_ID", "Google Client ID");
    this.validateRequired("GOOGLE_CLIENT_SECRET", "Google Client Secret");
    this.validateRequired("NEXT_PUBLIC_SUPABASE_URL", "Supabase URL");
    this.validateRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase Anon Key");
    this.validateRequired("SUPABASE_SERVICE_ROLE_KEY", "Supabase Service Role Key");

    // URL形式のチェック
    this.validateUrl("NEXTAUTH_URL");
    this.validateUrl("NEXT_PUBLIC_SUPABASE_URL");

    // 本番環境の追加チェック
    if (this.isProduction()) {
      this.validateProduction();
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }

  private validateRequired(key: keyof EnvConfig, label: string, minLength?: number) {
    const value = this.config[key];

    if (!value) {
      this.errors.push(`${label} (${key}) is required`);
      return;
    }

    if (minLength && value.length < minLength) {
      this.errors.push(`${label} (${key}) must be at least ${minLength} characters`);
    }
  }

  private validateUrl(key: keyof EnvConfig) {
    const value = this.config[key];

    if (!value) return;

    try {
      new URL(value);
    } catch {
      this.errors.push(`${key} must be a valid URL`);
    }
  }

  private validateProduction() {
    const nextAuthUrl = this.config.NEXTAUTH_URL;

    // HTTPS必須チェック
    if (nextAuthUrl && !nextAuthUrl.startsWith("https://")) {
      this.errors.push("NEXTAUTH_URL must use HTTPS in production");
    }

    // localhost禁止チェック
    if (
      nextAuthUrl &&
      (nextAuthUrl.includes("localhost") ||
        nextAuthUrl.includes("127.0.0.1") ||
        nextAuthUrl.includes("[::1]"))
    ) {
      this.errors.push("NEXTAUTH_URL cannot be localhost in production");
    }

    // シークレットキーの強度チェック
    const secret = this.config.NEXTAUTH_SECRET;
    if (secret && secret.length < 32) {
      this.errors.push("NEXTAUTH_SECRET must be at least 32 characters in production");
    }

    // Webhookシークレット必須チェック
    if (!this.config.WEBHOOK_SECRET) {
      this.errors.push("WEBHOOK_SECRET is required in production");
    }

    // Cronシークレット必須チェック（Vercel Cron用）
    if (!this.config.CRON_SECRET) {
      this.errors.push("CRON_SECRET is required for Vercel Cron in production");
    }
  }

  private isProduction(): boolean {
    const nodeEnv = this.config.NODE_ENV;
    const nextAuthUrl = this.config.NEXTAUTH_URL || "";

    return (
      nodeEnv === "production" ||
      (!nextAuthUrl.includes("localhost") &&
        !nextAuthUrl.includes("127.0.0.1") &&
        !nextAuthUrl.includes("[::1]"))
    );
  }

  public getConfig(): EnvConfig {
    const validation = this.validate();

    if (!validation.valid) {
      console.error("❌ Environment validation failed:");
      validation.errors.forEach((error) => console.error(`  - ${error}`));

      // 開発環境では警告のみ、本番環境ではエラー
      if (this.isProduction()) {
        throw new Error("Environment validation failed");
      } else {
        console.warn("⚠️  Running in development mode with invalid configuration");
      }
    }

    return this.config as EnvConfig;
  }

  public printStatus() {
    const validation = this.validate();
    const isProduction = this.isProduction();

    console.log("\n=== Environment Configuration ===");
    console.log(`Environment: ${isProduction ? "Production" : "Development"}`);
    console.log(`Status: ${validation.valid ? "✅ Valid" : "❌ Invalid"}`);

    if (!validation.valid) {
      console.log("\nErrors:");
      validation.errors.forEach((error) => console.log(`  - ${error}`));
    }

    console.log("\nConfiguration:");
    console.log(`  NEXTAUTH_URL: ${this.maskString(this.config.NEXTAUTH_URL)}`);
    console.log(`  NEXTAUTH_SECRET: ${this.maskString(this.config.NEXTAUTH_SECRET, 4)}`);
    console.log(`  GOOGLE_CLIENT_ID: ${this.maskString(this.config.GOOGLE_CLIENT_ID)}`);
    console.log(`  GOOGLE_CLIENT_SECRET: ${this.maskString(this.config.GOOGLE_CLIENT_SECRET, 4)}`);
    console.log(`  SUPABASE_URL: ${this.maskString(this.config.NEXT_PUBLIC_SUPABASE_URL)}`);
    console.log(`  SUPABASE_ANON_KEY: ${this.maskString(this.config.NEXT_PUBLIC_SUPABASE_ANON_KEY, 10)}`);
    console.log(`  SUPABASE_SERVICE_KEY: ${this.maskString(this.config.SUPABASE_SERVICE_ROLE_KEY, 10)}`);
    console.log(`  WEBHOOK_SECRET: ${this.config.WEBHOOK_SECRET ? "✅ Set" : "❌ Not set"}`);
    console.log(`  CRON_SECRET: ${this.config.CRON_SECRET ? "✅ Set" : "❌ Not set"}`);
    console.log("================================\n");
  }

  private maskString(str?: string, visibleChars: number = 8): string {
    if (!str) return "❌ Not set";
    if (str.length <= visibleChars * 2) return "***";

    const start = str.substring(0, visibleChars);
    const end = str.substring(str.length - visibleChars);
    return `${start}...${end}`;
  }
}

// シングルトンインスタンス
let envValidator: EnvValidator | null = null;

export function getEnvConfig(): EnvConfig {
  if (!envValidator) {
    envValidator = new EnvValidator();

    // 開発環境では起動時に状態を表示
    if (process.env.NODE_ENV !== "production") {
      envValidator.printStatus();
    }
  }

  return envValidator.getConfig();
}

export function validateEnv(): { valid: boolean; errors: string[] } {
  if (!envValidator) {
    envValidator = new EnvValidator();
  }

  return envValidator.validate();
}

export function printEnvStatus() {
  if (!envValidator) {
    envValidator = new EnvValidator();
  }

  envValidator.printStatus();
}

// 起動時の自動検証（オプショナル）
if (typeof window === "undefined" && process.env.VALIDATE_ENV_ON_STARTUP === "true") {
  getEnvConfig();
}