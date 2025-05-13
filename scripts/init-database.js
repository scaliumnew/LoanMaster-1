// Database Initialization Script
// This script initializes the database during deployment or first run
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Path to stored exports
const EXPORT_DIR = path.join(process.cwd(), 'database-export');

function findLatestDump() {
  if (!fs.existsSync(EXPORT_DIR)) {
    return null;
  }
  
  // Look for data-*.sql files and find the latest one
  const files = fs.readdirSync(EXPORT_DIR)
    .filter(file => file.startsWith('data-') && file.endsWith('.sql'))
    .sort();
  
  return files.length ? path.join(EXPORT_DIR, files[files.length - 1]) : null;
}

async function checkDatabaseAccess() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set it to continue with database initialization.');
    return false;
  }
  
  try {
    // Use a simple query to test database connection
    console.log('Testing database connection...');
    
    execSync(`npx drizzle-kit push:pg`, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    });
    
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    return false;
  }
}

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

async function initDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Check if we can connect to the database
    const hasAccess = await checkDatabaseAccess();
    if (!hasAccess) {
      console.error('Unable to connect to the database. Initialization aborted.');
      process.exit(1);
    }
    
    // Check if schema.sql exists
    const schemaFile = path.join(EXPORT_DIR, 'schema.sql');
    
    if (fs.existsSync(schemaFile)) {
      console.log('Found schema.sql export, applying to database...');
      
      try {
        // Apply schema
        execSync(`psql "${process.env.DATABASE_URL}" -f "${schemaFile}"`, {
          stdio: 'inherit',
          shell: true
        });
        console.log('Schema applied successfully.');
        
        // Look for data files
        const dataFile = findLatestDump();
        if (dataFile) {
          console.log(`Found data export: ${dataFile}`);
          const importData = await askQuestion('Do you want to import the exported data? (y/n): ');
          
          if (importData.toLowerCase() === 'y') {
            console.log('Importing data...');
            execSync(`psql "${process.env.DATABASE_URL}" -f "${dataFile}"`, {
              stdio: 'inherit',
              shell: true
            });
            console.log('Data imported successfully.');
          } else {
            console.log('Data import skipped.');
          }
        } else {
          console.log('No data export found.');
        }
      } catch (error) {
        console.error('Failed to apply database exports:', error.message);
        console.log('Falling back to Drizzle migration...');
        
        // Fallback to Drizzle
        execSync(`npx drizzle-kit push:pg`, {
          stdio: 'inherit',
          shell: true,
          env: { ...process.env }
        });
      }
    } else {
      // Use Drizzle migration as primary method
      console.log('No schema export found, using Drizzle to initialize database...');
      execSync(`npx drizzle-kit push:pg`, {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env }
      });
      console.log('Database schema initialized using Drizzle.');
    }
    
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initDatabase();