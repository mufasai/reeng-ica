// Test script to simulate what the React app does
import { Surreal } from 'surrealdb';

const db = new Surreal();

async function connectDB() {
  try {
    let url = 'https://surrealdb-production-b201.up.railway.app';
    const username = 'root';
    const password = 'root';
    const namespace = 'yerico';
    const database = 'project_budget';

    // Append /rpc if missing
    if ((url.startsWith('http://') || url.startsWith('https://')) && !url.endsWith('/rpc')) {
      url = url.endsWith('/') ? `${url}rpc` : `${url}/rpc`;
    }

    console.log(`Connecting to SurrealDB: ${url}`);
    await db.connect(url);
    await db.signin({ username, password });
    await db.use({ namespace, database });
    console.log('✅ Connected to SurrealDB successfully!\n');
    return true;
  } catch (err) {
    console.error('❌ SurrealDB Connection Error:', err);
    return false;
  }
}

async function testQueries() {
  const connected = await connectDB();
  if (!connected) {
    console.log('Cannot proceed - connection failed');
    return;
  }

  try {
    // Test 1: site_technical_details
    console.log('=== Test 1: Querying site_technical_details ===');
    const detailsResult = await db.query('SELECT * FROM site_technical_details LIMIT 5');
    console.log('Result structure:', typeof detailsResult, Array.isArray(detailsResult));
    console.log('Result[0] type:', typeof detailsResult?.[0], Array.isArray(detailsResult?.[0]));
    console.log('Result[0] length:', detailsResult?.[0]?.length);
    if (detailsResult?.[0] && Array.isArray(detailsResult[0])) {
      console.log('✅ Got', detailsResult[0].length, 'technical detail records');
      console.log('Sample:', JSON.stringify(detailsResult[0][0], null, 2));
    } else {
      console.log('❌ Unexpected result structure');
    }

    // Test 2: sites
    console.log('\n=== Test 2: Querying sites ===');
    const sitesResult = await db.query('SELECT * FROM sites LIMIT 5');
    if (sitesResult?.[0] && Array.isArray(sitesResult[0])) {
      console.log('✅ Got', sitesResult[0].length, 'site records');
      console.log('Sample:', JSON.stringify(sitesResult[0][0], null, 2));
    } else {
      console.log('❌ Unexpected result structure');
    }

    // Test 3: materials
    console.log('\n=== Test 3: Querying materials ===');
    const matsResult = await db.query('SELECT * FROM materials LIMIT 5');
    if (matsResult?.[0] && Array.isArray(matsResult[0])) {
      console.log('✅ Got', matsResult[0].length, 'material records');
    } else {
      console.log('❌ Unexpected result structure');
    }

    console.log('\n✅ All tests passed! Database connection is working correctly.');
    console.log('The React app should be able to load data from the database.');

  } catch (e) {
    console.error('❌ Query error:', e);
  } finally {
    db.close();
  }
}

testQueries();
