const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Function to find the latest database dump
function findLatestDump() {
  const exportDir = path.join(__dirname, '..', 'database-export');
  
  if (!fs.existsSync(exportDir)) {
    console.log('No database export directory found. Will use schema from drizzle instead.');
    return null;
  }
  
  const files = fs.readdirSync(exportDir);
  const fullDumps = files.filter(file => file.startsWith('full-dump-')).sort().reverse();
  
  if (fullDumps.length === 0) {
    console.log('No database dumps found. Will use schema from drizzle instead.');
    return null;
  }
  
  return path.join(exportDir, fullDumps[0]);
}

// Function to check if database exists and is accessible
async function checkDatabaseAccess() {
  try {
    execSync('psql $DATABASE_URL -c "SELECT 1"', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to prompt user
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

// Main function
async function initDatabase() {
  console.log('Checking database connection...');
  
  const dbAccessible = await checkDatabaseAccess();
  
  if (!dbAccessible) {
    console.error('Cannot access database. Please check your DATABASE_URL environment variable.');
    process.exit(1);
  }
  
  console.log('Database is accessible.');
  
  // Check for existing database dump
  const latestDump = findLatestDump();
  
  if (latestDump) {
    console.log(`Found database dump: ${path.basename(latestDump)}`);
    const answer = await askQuestion('Do you want to restore from this dump? (y/n) ');
    
    if (answer.toLowerCase() === 'y') {
      try {
        console.log('Restoring database from dump...');
        execSync(`psql $DATABASE_URL < ${latestDump}`, { stdio: 'inherit' });
        console.log('Database restored successfully!');
        return;
      } catch (error) {
        console.error('Error restoring database:', error.message);
        console.log('Falling back to schema migration...');
      }
    }
  }
  
  // Use drizzle to push schema
  console.log('Initializing database with drizzle schema...');
  try {
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('Database schema applied successfully!');
  } catch (error) {
    console.error('Error applying database schema:', error.message);
    process.exit(1);
  }
}

// Run the main function
initDatabase().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});