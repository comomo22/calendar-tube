const { Client } = require('pg');

const connectionString = `postgresql://postgres.kcmjxpeptmfjsyioxwyv:050625Amk@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;

async function checkDatabase() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続\n');

    // ユーザー一覧
    console.log('📊 ユーザー一覧:');
    const users = await client.query('SELECT * FROM users ORDER BY created_at');
    console.table(users.rows);

    // Googleアカウント一覧
    console.log('\n📧 Googleアカウント一覧:');
    const accounts = await client.query('SELECT id, user_id, email, name, created_at FROM google_accounts ORDER BY created_at');
    console.table(accounts.rows);

    // カレンダー一覧
    console.log('\n📅 カレンダー一覧:');
    const calendars = await client.query('SELECT id, google_account_id, calendar_name, is_active, created_at FROM calendars ORDER BY created_at');
    console.table(calendars.rows);

    // 同期イベント数
    console.log('\n🔄 同期イベント数:');
    const syncEvents = await client.query('SELECT COUNT(*) FROM sync_events');
    console.log(`合計: ${syncEvents.rows[0].count}件\n`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
