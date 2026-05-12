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
    console.log('Connected successfully!\n');

    // Check site_technical_details
    console.log('=== Checking site_technical_details ===');
    const techResult = await db.query('SELECT count() FROM site_technical_details GROUP ALL');
    console.log('Count:', techResult);
    const techSample = await db.query('SELECT * FROM site_technical_details LIMIT 3');
    console.log('Sample records:', JSON.stringify(techSample, null, 2));

    // Check sites table
    console.log('\n=== Checking sites table ===');
    const sitesResult = await db.query('SELECT count() FROM sites GROUP ALL');
    console.log('Count:', sitesResult);
    const sitesSample = await db.query('SELECT * FROM sites LIMIT 3');
    console.log('Sample records:', JSON.stringify(sitesSample, null, 2));

    // Check materials
    console.log('\n=== Checking materials table ===');
    const matsResult = await db.query('SELECT count() FROM materials GROUP ALL');
    console.log('Count:', matsResult);

    // List all tables
    console.log('\n=== All tables in database ===');
    const tables = await db.query('INFO FOR DB');
    console.log('Tables:', JSON.stringify(tables, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.close();
  }
}

main();
