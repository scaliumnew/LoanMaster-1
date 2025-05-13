const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', 'database-export');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Export timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const schemaPath = path.join(outputDir, `schema-${timestamp}.sql`);
const dataPath = path.join(outputDir, `data-${timestamp}.sql`);
const fullDumpPath = path.join(outputDir, `full-dump-${timestamp}.sql`);

try {
  console.log('Exporting database schema and data...');
  
  // Export schema only (structure without data)
  console.log('Exporting schema...');
  execSync(`pg_dump --schema-only --no-owner --no-acl $DATABASE_URL > ${schemaPath}`, {
    stdio: 'inherit',
  });
  
  // Export data only
  console.log('Exporting data...');
  execSync(`pg_dump --data-only --no-owner --no-acl $DATABASE_URL > ${dataPath}`, {
    stdio: 'inherit',
  });
  
  // Export full dump (schema + data)
  console.log('Exporting full dump...');
  execSync(`pg_dump --no-owner --no-acl $DATABASE_URL > ${fullDumpPath}`, {
    stdio: 'inherit',
  });
  
  console.log('Database export completed successfully!');
  console.log(`Output files are in: ${outputDir}`);
  console.log(`- Schema only: ${path.basename(schemaPath)}`);
  console.log(`- Data only: ${path.basename(dataPath)}`);
  console.log(`- Full dump: ${path.basename(fullDumpPath)}`);
} catch (error) {
  console.error('Error exporting database:', error.message);
  process.exit(1);
}