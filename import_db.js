import fs from 'fs';
import { Surreal } from 'surrealdb';

async function main() {
  const db = new Surreal();
  
  try {
    console.log('Connecting to SurrealDB...');
    await db.connect('https://surrealdb-production-b201.up.railway.app/rpc');
    await db.signin({
      username: 'root',
      password: 'root',
    });
    await db.use({ namespace: 'yerico', database: 'project_budget' });
    console.log('Connected and signed in successfully!');

    console.log('Reading JSON dump...');
    const dbDump = JSON.parse(fs.readFileSync('files/new-query-2026-05-04-4.json', 'utf8'));
    const records = dbDump[0];
    console.log(`Found ${records.length} records to import.`);

    let success = 0;
    let failed = 0;
    for (const record of records) {
      const table = record._table;
      const id = record.id;
      delete record._table;
      delete record.id;
      
      try {
        if (id) {
            await db.query(`CREATE type::thing($id) CONTENT $record`, { id, record });
        } else {
            await db.create(table, record);
        }
        success++;
        if (success % 100 === 0) console.log(`Imported ${success} records...`);
      } catch (err) {
        console.error(`Failed to import record for table ${table} with id ${id}:`, err.message);
        failed++;
      }
    }
    console.log(`Import complete! Success: ${success}, Failed: ${failed}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.close();
  }
}

main();
