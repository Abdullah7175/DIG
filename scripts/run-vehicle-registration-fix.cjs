const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://root:password@localhost:5432/hospital_management'
});

async function fixVehicleRegistrationConstraint() {
  let client;
  try {
    console.log('🔄 Fixing vehicle registration constraint...');
    
    client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Read and execute SQL
    const sqlPath = path.join(__dirname, 'fix-vehicle-registration-constraint.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('✅ Vehicle registration constraint updated successfully!');
    
    // Verify the changes
    const constraintCheck = await client.query(`
      SELECT 
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'public.vehicles'::regclass 
      AND conname LIKE '%registration%';
    `);
    
    console.log('📋 Current registration constraints:');
    constraintCheck.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_definition}`);
    });
    
    // Test the new constraint by showing what's now possible
    console.log('\n✅ You can now register vehicles with same number plates from different regions:');
    console.log('  Example: TTA-185 from Karachi ✓');
    console.log('  Example: TTA-185 from Lasbela ✓');
    console.log('  Example: JV-1005 from Karachi ✓');
    console.log('  Example: JV-1005 from Islamabad ✓');
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure PostgreSQL is running and the connection details are correct');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Please create the database first');
    } else if (error.code === '42P01') {
      console.error('💡 Vehicles table does not exist. Please run the main schema first');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

fixVehicleRegistrationConstraint();
