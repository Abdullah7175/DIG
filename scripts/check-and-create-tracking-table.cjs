const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://root:password@localhost:5432/hospital_management'
});

async function checkAndCreateTrackingTable() {
  let client;
  try {
    console.log('🔄 Checking if tracking_events table exists...');
    
    client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tracking_events'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      console.log('✅ tracking_events table already exists');
      
      // Get record count
      const countResult = await client.query('SELECT COUNT(*) FROM tracking_events');
      console.log(`📊 Current record count: ${countResult.rows[0].count}`);
      
    } else {
      console.log('⚠️  tracking_events table does not exist, creating it...');
      
      // Read and execute SQL
      const sqlPath = path.join(__dirname, 'create-tracking-events-table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      await client.query(sql);
      console.log('✅ tracking_events table created successfully!');
      
      // Verify creation
      const result = await client.query('SELECT COUNT(*) FROM tracking_events');
      console.log(`✅ Table verified - current record count: ${result.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure PostgreSQL is running and the connection details are correct');
      console.error('💡 Check your DATABASE_URL environment variable');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Please create the database first');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

checkAndCreateTrackingTable();
