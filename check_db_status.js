import { Surreal } from 'surrealdb';

async function check() {
  const db = new Surreal();
  try {
    console.log('Connecting to SurrealDB...');
    await db.connect('https://surrealdb-production-b201.up.railway.app/rpc');
    await db.signin({
      username: 'root',
      password: 'root',
    });
    await db.use({ namespace: 'yerico', database: 'project_budget' });
    console.log('Connected!');

    const tables = ['sites', 'site_technical_details', 'materials'];
    for (const table of tables) {
      const count = await db.query(`SELECT count() FROM type::table($table) GROUP ALL`, { table });
      console.log(`Table ${table}:`, JSON.stringify(count));
    }
  } catch (err) {
    console.error('Connection Error:', err);
  } finally {
    db.close();
  }
}

check();
