// Database Export Script
// This script exports the database schema and data for deployment
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Path to store exports
const EXPORT_DIR = path.join(process.cwd(), 'database-export');

// Create directory if it doesn't exist
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Utility function to create a timestamp
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
}

// Utility to ask questions
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Main export function
async function exportDatabase() {
  try {
    console.log('Starting database export...');
    
    // Make sure DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('ERROR: DATABASE_URL environment variable is not set!');
      console.error('Please set it to continue with the export.');
      process.exit(1);
    }
    
    // Confirm with the user
    const proceed = await askQuestion('This will export your database for deployment. Continue? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('Export canceled.');
      process.exit(0);
    }
    
    const timestamp = getTimestamp();
    const schemaFile = path.join(EXPORT_DIR, 'schema.sql');
    const dataFile = path.join(EXPORT_DIR, `data-${timestamp}.sql`);
    
    console.log('Exporting database schema...');
    
    try {
      // Use pg_dump to export the schema
      execSync(`pg_dump --schema-only "${process.env.DATABASE_URL}" > "${schemaFile}"`, { 
        stdio: 'inherit',
        shell: true 
      });
      
      console.log(`Schema exported to: ${schemaFile}`);
      
      // Export data (tables only, no sequences)
      console.log('Exporting data...');
      execSync(`pg_dump --data-only "${process.env.DATABASE_URL}" > "${dataFile}"`, {
        stdio: 'inherit',
        shell: true
      });
      
      console.log(`Data exported to: ${dataFile}`);
      
      // Create migration script for Drizzle
      console.log('Creating a drizzle migration script...');
      execSync(`npx drizzle-kit generate:pg --schema=./shared/schema.ts`, {
        stdio: 'inherit',
        shell: true
      });
      
      console.log('Export complete!');
      console.log('\nThese files can be used during deployment to initialize your database.');
      console.log('The schema.sql file contains your table structure.');
      console.log(`The data-${timestamp}.sql file contains your current data.`);
      
    } catch (error) {
      console.error('Failed to export database:', error.message);
      console.log('You might need to install pg_dump or use another export method.');
      
      // Fallback: generate a drizzle-kit migration
      console.log('Trying to create a drizzle migration as fallback...');
      try {
        execSync(`npx drizzle-kit generate:pg --schema=./shared/schema.ts`, {
          stdio: 'inherit',
          shell: true
        });
        console.log('Drizzle migration created successfully. You can use this for deployment.');
      } catch (drizzleError) {
        console.error('Failed to create drizzle migration:', drizzleError.message);
      }
    }
    
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

// Run the export
exportDatabase();