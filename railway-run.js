// Custom startup script for Railway deployment
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Railway Startup] Initializing application...');

// Create necessary directories to prevent path errors
const requiredDirectories = [
  'database-export',
  'dist'
];

// Ensure all required directories exist
requiredDirectories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`[Railway Startup] Creating directory: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  console.log('[Railway Startup] WARNING: No DATABASE_URL found.');
  console.log('[Railway Startup] Creating fallback DATABASE_URL for Railway deployment.');
  
  // Set a dummy DATABASE_URL to prevent errors
  // This will be replaced by the actual Railway Postgres DATABASE_URL when connected
  process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy_db?schema=public';
  
  // Create an empty .env file if it doesn't exist
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('[Railway Startup] Creating .env file with fallback variables');
    fs.writeFileSync(envPath, 'DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy_db?schema=public\nNODE_ENV=production\nRAILWAY_ENVIRONMENT=production\n');
  }
}

// Create placeholder schema.sql file to prevent path errors
const schemaPath = path.join(process.cwd(), 'database-export', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.log('[Railway Startup] Creating placeholder schema.sql');
  fs.writeFileSync(schemaPath, '-- Placeholder schema file for Railway deployment\n');
}

// Set production environment
process.env.NODE_ENV = 'production';
process.env.RAILWAY_ENVIRONMENT = 'production';

console.log('[Railway Startup] Environment prepared, starting application...');

// Start the application
try {
  // Run the normal start command for production
  require('./dist/index.js');
} catch (error) {
  console.error('[Railway Startup] Application startup failed:', error);
  process.exit(1);
}