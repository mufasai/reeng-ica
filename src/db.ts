// Mocking SurrealDB for now as it is not installed
// import { Surreal } from 'surrealdb';

export const db: any = {
  status: 'disconnected',
  connect: async () => {},
  signin: async () => {},
  use: async () => {},
};

export async function connectDB() {
  console.log('SurrealDB mock: connection skipped.');
}
