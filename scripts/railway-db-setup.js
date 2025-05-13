// Railway Specific Database Setup Script
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Pool } = require('@neondatabase/serverless');

// Utility function to execute a command and return a promise
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Utility to log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Main function to run database setup
async function setupDatabase() {
  log('Starting Railway database setup...');
  
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log('ERROR: DATABASE_URL environment variable not found.');
    log('Make sure to set this in your Railway project variables.');
    process.exit(1);
  }
  
  log('Database URL found in environment.');
  
  // Create database connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  });
  
  // Test database connection
  try {
    log('Testing database connection...');
    const client = await pool.connect();
    log('Successfully connected to database.');
    
    try {
      // Check if tables exist
      const { rows } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      log(`Found ${rows.length} tables in database.`);
      
      if (rows.length === 0) {
        log('No tables found. Initializing database schema...');
        
        // For Railway, it's better to use drizzle-kit push
        try {
          log('Attempting to push schema with drizzle-kit...');
          await execPromise('npx drizzle-kit push:pg');
          log('Successfully pushed schema using drizzle-kit.');
        } catch (drizzleError) {
          log('Failed to push schema with drizzle-kit.');
          log('Falling back to manual table creation...');
          
          // Path to schema files
          const exportDir = path.join(process.cwd(), 'database-export');
          const schemaFile = path.join(exportDir, 'schema.sql');
          
          if (fs.existsSync(schemaFile)) {
            log(`Found schema file at ${schemaFile}`);
            try {
              const schemaContent = fs.readFileSync(schemaFile, 'utf8');
              log('Executing schema script...');
              await client.query(schemaContent);
              log('Schema successfully applied.');
            } catch (sqlError) {
              log(`Error applying schema: ${sqlError.message}`);
              log('Database might be partially initialized.');
            }
          } else {
            log('No schema file found. Database initialization may be incomplete.');
          }
        }
      } else {
        log('Database tables already exist. No initialization needed.');
      }
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    log(`Database connection failed: ${error.message}`);
    log('Check your DATABASE_URL and make sure the database is accessible.');
    process.exit(1);
  } finally {
    // End the pool
    await pool.end();
  }
  
  log('Railway database setup complete.');
}

// Run the setup
setupDatabase().catch(error => {
  log(`Unhandled error during setup: ${error.message}`);
  process.exit(1);
});