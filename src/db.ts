import { Surreal } from 'surrealdb';

export const db = new Surreal();

export async function connectDB() {
  if (db.status === 'connected') return;
  try {
    await db.connect('https://surrealdb-production-b201.up.railway.app/rpc');
    await db.signin({
      username: 'root',
      password: 'root',
    });
    await db.use({ namespace: 'yerico', database: 'project_budget' });
    console.log('Connected to SurrealDB successfully!');
  } catch (err) {
    console.error('SurrealDB Connection Error:', err);
  }
}
