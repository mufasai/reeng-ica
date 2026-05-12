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
    console.log('Connected!');

    const rootInfo = await db.query('INFO FOR ROOT;');
    console.log('Root Info:', JSON.stringify(rootInfo, null, 2));
  } catch (err) {
    console.error('Connection Error:', err);
  } finally {
    db.close();
  }
}

check();
