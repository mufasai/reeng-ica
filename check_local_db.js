import { Surreal } from 'surrealdb';

async function check() {
  const db = new Surreal();
  try {
    console.log('Connecting to Local SurrealDB on port 8000...');
    await db.connect('http://127.0.0.1:8000/rpc');
    await db.signin({
      username: 'root',
      password: 'root',
    });
    console.log('Connected and signed in to local db!');

    // Try a few namespace/db combinations that might exist
    const combos = [
      { ns: 'yerico', dbName: 'project_budget' },
      { ns: 'test', dbName: 'test' }
    ];

    for (const combo of combos) {
       console.log(`\nChecking NS: ${combo.ns}, DB: ${combo.dbName}...`);
       try {
         await db.use({ namespace: combo.ns, database: combo.dbName });
         const tablesResult = await db.query('INFO FOR DB;');
         console.log(`DB Info for ${combo.ns}/${combo.dbName}:`, JSON.stringify(tablesResult, null, 2));
         
         // Check count of 'sites' in this specific DB
         const countRes = await db.query('SELECT count() FROM sites GROUP ALL;');
         console.log(`Count for 'sites' table:`, JSON.stringify(countRes, null, 2));
       } catch(e) {
         console.error(`Failed for ${combo.ns}/${combo.dbName}:`, e.message);
       }
    }
  } catch (err) {
    console.error('Connection Error:', err);
  } finally {
    db.close();
  }
}

check();
