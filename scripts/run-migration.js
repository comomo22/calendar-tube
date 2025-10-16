const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase接続情報
const connectionString = `postgresql://postgres:050625Amk@db.kcmjxpeptmfjsyioxwyv.supabase.co:5432/postgres`;

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('📊 Supabaseデータベースに接続中...');
    await client.connect();
    console.log('✅ 接続成功\n');

    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔧 SQLを実行中...');
    console.log('─────────────────────────────────────');

    // SQLを実行
    await client.query(sql);

    console.log('─────────────────────────────────────');
    console.log('✅ マイグレーション完了！\n');

    // テーブル一覧を確認
    console.log('📋 作成されたテーブル:');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    console.log('\n🎉 データベースセットアップ完了！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('詳細:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
