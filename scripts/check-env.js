#!/usr/bin/env node

/**
 * 環境変数チェックスクリプト
 * 必要な環境変数が全て設定されているか確認します
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const optionalEnvVars = [
  'WEBHOOK_SECRET',
];

console.log('🔍 環境変数チェック開始...\n');

// .envファイルの存在確認
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .envファイルが見つかりません');
  console.log('💡 .env.exampleを.envにコピーしてください:');
  console.log('   cp .env.example .env\n');
  process.exit(1);
}

// .envファイルを読み込み
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

// 必須環境変数のチェック
let missingVars = [];
let emptyVars = [];

console.log('📋 必須環境変数:');
requiredEnvVars.forEach(varName => {
  if (!envVars[varName]) {
    missingVars.push(varName);
    console.log(`  ❌ ${varName}: 未設定`);
  } else if (envVars[varName].includes('your-') || envVars[varName].includes('here')) {
    emptyVars.push(varName);
    console.log(`  ⚠️  ${varName}: プレースホルダーのまま`);
  } else {
    const maskedValue = varName.includes('SECRET') || varName.includes('KEY')
      ? '***' + envVars[varName].slice(-4)
      : envVars[varName].substring(0, 20) + '...';
    console.log(`  ✅ ${varName}: ${maskedValue}`);
  }
});

// オプション環境変数のチェック
console.log('\n📋 オプション環境変数:');
optionalEnvVars.forEach(varName => {
  if (envVars[varName]) {
    console.log(`  ✅ ${varName}: 設定済み`);
  } else {
    console.log(`  ⚪️ ${varName}: 未設定（オプション）`);
  }
});

// 結果サマリー
console.log('\n' + '='.repeat(50));
if (missingVars.length === 0 && emptyVars.length === 0) {
  console.log('✅ 全ての必須環境変数が正しく設定されています！');
  console.log('\n次のステップ:');
  console.log('  npm run dev を実行してアプリを起動してください');
  process.exit(0);
} else {
  console.log('❌ 環境変数の設定が不完全です\n');

  if (missingVars.length > 0) {
    console.log('未設定の変数:');
    missingVars.forEach(v => console.log(`  - ${v}`));
    console.log();
  }

  if (emptyVars.length > 0) {
    console.log('プレースホルダーのまま変数:');
    emptyVars.forEach(v => console.log(`  - ${v}`));
    console.log();
  }

  console.log('セットアップガイドを参照してください:');
  console.log('  README.md の「セットアップ手順」セクション');
  process.exit(1);
}
