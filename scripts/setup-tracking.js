const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://root:password@localhost:5432/hospital_management'
});

async function setupTracking() {
  try {
    console.log('🔄 Setting up tracking events table...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Read and execute SQL
    const sqlPath = path.join(__dirname, 'create-tracking-events-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('✅ Tracking events table created successfully!');
    
    // Test the table
    const result = await client.query('SELECT COUNT(*) FROM tracking_events');
    console.log(`✅ Table verified - current record count: ${result.rows[0].count}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error setting up tracking:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

setupTracking();
