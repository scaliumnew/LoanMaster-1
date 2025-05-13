#!/usr/bin/env node

/**
 * Railway PostgreSQL Setup Script
 * 
 * This script automatically configures the database connection for Railway.
 * It runs before the main application starts to ensure proper connection.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Utility to execute commands with promise
function execPromise(command) {
  return new Promise((resolve, reject) => {
    try {
      const output = execSync(command, { encoding: 'utf8' });
      resolve(output);
    } catch (error) {
      reject(error);
    }
  });
}

// Utility for logging
function log(message) {
  console.log(`[Railway DB Setup] ${message}`);
}

// Main setup function
async function setupDatabase() {
  log('Starting Railway PostgreSQL Setup...');
  
  // Only run in Railway environment
  if (!process.env.RAILWAY_ENVIRONMENT) {
    log('Not running in Railway environment. Exiting.');
    return;
  }
  
  log('Detected Railway environment. Checking database connection...');
  
  // Check if database URL is properly set
  if (!process.env.DATABASE_URL || 
      process.env.DATABASE_URL.includes('${{') || 
      process.env.DATABASE_URL.includes('.railway.internal')) {
    
    log('DATABASE_URL needs adjustment for Railway internal networking');
    
    // Set environment variables for internal networking
    process.env.DATABASE_URL = 'postgresql://postgres:YtXeaamwlmLyWgQhjVkcMusInbHPydpB@postgres:5432/railway';
    process.env.PGHOST = 'postgres';
    process.env.PGUSER = 'postgres';
    process.env.PGPASSWORD = 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB';
    process.env.PGDATABASE = 'railway';
    process.env.PGPORT = '5432';
    process.env.PGSSLMODE = 'disable';
    
    log('Set environment variables for Railway internal networking');
    log('Using "postgres" as host for service-to-service communication');
    
    // Test connection with the new settings
    try {
      const { Pool } = require('pg');
      
      // Create a test pool
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Accept self-signed certificates
        connectionTimeoutMillis: 10000
      });
      
      // Try to connect
      log('Testing database connection...');
      const result = await pool.query('SELECT NOW()');
      
      log('Database connection successful!');
      log(`Server time: ${result.rows[0].now}`);
      
      // Check for existing tables
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      if (tablesResult.rows.length === 0) {
        log('No tables found. Database needs initialization.');
        
        // We need to initialize the database schema
        try {
          log('Creating database tables...');
          
          // Execute the database schema creation here, using Drizzle or running SQL scripts
          // This depends on your project structure, but here's an example:
          
          const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'database-export', 'schema.sql'), 'utf8');
          
          // Execute the schema SQL within a transaction
          await pool.query('BEGIN');
          await pool.query(schemaSQL);
          await pool.query('COMMIT');
          
          log('Database schema created successfully!');
        } catch (err) {
          log(`Error creating database schema: ${err.message}`);
          log('The application may still run, but you might need to manually initialize the database.');
        }
      } else {
        log(`Found ${tablesResult.rows.length} existing tables in the database.`);
      }
      
      // Everything is set up!
      log('Database setup complete!');
      
    } catch (err) {
      log(`Database connection test failed: ${err.message}`);
      log('The application will start with limited functionality.');
      log('You may need to manually configure the database connection in Railway.');
    }
  } else {
    log('DATABASE_URL is already set properly. No changes needed.');
  }
}

// Run the setup
setupDatabase().catch(err => {
  log(`Error during database setup: ${err.message}`);
  log('The application will continue to start, but may have limited functionality.');
});