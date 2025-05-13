#!/usr/bin/env node

/**
 * Railway PostgreSQL Troubleshooting Script
 * 
 * This script helps diagnose database connection issues in Railway environment.
 * Run this script in your Railway deployment to verify connection options.
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

console.log('===== Railway PostgreSQL Troubleshooting =====');
console.log(`Starting troubleshooting at ${new Date().toISOString()}`);
console.log('\n');

// Log environment information
console.log('=== Environment Information ===');
console.log(`Node.js version: ${process.version}`);
console.log(`Process architecture: ${process.arch}`);
console.log(`Platform: ${process.platform}`);
console.log(`Working directory: ${process.cwd()}`);
console.log(`Railway environment: ${process.env.RAILWAY_ENVIRONMENT || 'Not set'}`);
console.log(`Railway service: ${process.env.RAILWAY_SERVICE_NAME || 'Not set'}`);
console.log('\n');

// Log all PostgreSQL-related environment variables (without sensitive values)
console.log('=== PostgreSQL Environment Variables ===');
Object.keys(process.env).filter(key => 
  key.startsWith('PG') || 
  key.startsWith('POSTGRES') || 
  key === 'DATABASE_URL' ||
  key.startsWith('RAILWAY')
).forEach(key => {
  const value = process.env[key];
  if (key === 'DATABASE_URL' || key === 'PGPASSWORD' || key.includes('PASSWORD')) {
    console.log(`${key}: ${value ? '******' : 'Not set'}`);
  } else {
    console.log(`${key}: ${value || 'Not set'}`);
  }
});
console.log('\n');

// Test networking
console.log('=== Networking Tests ===');

// Test connection to various PostgreSQL hosts
const testHosts = [
  { name: 'Internal service name "postgres"', host: 'postgres', port: 5432 },
  { name: 'RAILWAY_PRIVATE_DOMAIN', host: process.env.RAILWAY_PRIVATE_DOMAIN, port: 5432 },
  { name: 'PGHOST', host: process.env.PGHOST, port: 5432 },
];

async function testConnection(config) {
  if (!config.host) {
    console.log(`Skipping test for ${config.name} - host not set`);
    return false;
  }
  
  console.log(`Testing connection to ${config.name} (${config.host}:${config.port})...`);
  
  try {
    // Try to connect using pg
    const pool = new Pool({
      user: 'postgres',
      password: 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB',
      host: config.host,
      port: config.port,
      database: 'railway',
      ssl: false,
      connectionTimeoutMillis: 5000
    });
    
    // Execute query
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ Connection to ${config.name} SUCCESSFUL!`);
    console.log(`   Server time: ${result.rows[0].now}`);
    return true;
  } catch (err) {
    console.log(`❌ Connection to ${config.name} FAILED!`);
    console.log(`   Error: ${err.message}`);
    return false;
  }
}

// Run networking tests
async function runNetworkingTests() {
  console.log('Testing network connectivity to PostgreSQL...');
  
  let anySuccessful = false;
  
  for (const config of testHosts) {
    const result = await testConnection(config);
    if (result) {
      anySuccessful = true;
    }
  }
  
  if (anySuccessful) {
    console.log('\n✅ At least one connection was successful!');
  } else {
    console.log('\n❌ All connection attempts failed!');
  }
  
  console.log('\n');
}

// Test current DATABASE_URL
async function testDatabaseUrl() {
  console.log('=== Testing DATABASE_URL ===');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL is not set!');
    return;
  }
  
  console.log(`Testing connection with DATABASE_URL...`);
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
      connectionTimeoutMillis: 5000
    });
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connection with DATABASE_URL SUCCESSFUL!');
    console.log(`   Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.log('❌ Connection with DATABASE_URL FAILED!');
    console.log(`   Error: ${err.message}`);
  }
  
  console.log('\n');
}

// Check database schema
async function checkDatabaseSchema() {
  console.log('=== Database Schema Check ===');
  
  try {
    // Try internal networking connection
    const pool = new Pool({
      user: 'postgres',
      password: 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB',
      host: 'postgres',
      port: 5432,
      database: 'railway',
      ssl: false,
      connectionTimeoutMillis: 5000
    });
    
    // Check tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found in database!');
    } else {
      console.log(`✅ Found ${tablesResult.rows.length} tables in database:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
  } catch (err) {
    console.log('❌ Could not check database schema!');
    console.log(`   Error: ${err.message}`);
  }
  
  console.log('\n');
}

// Provide recommendations
function provideRecommendations() {
  console.log('=== Recommendations ===');
  console.log('Based on Railway documentation and best practices:');
  console.log('1. For internal service-to-service communication, use "postgres" as the hostname');
  console.log('2. Make sure your database service is named "postgres" in Railway');
  console.log('3. Set PGSSLMODE=disable for Railway internal networking');
  console.log('4. Consider manually setting DATABASE_URL in Railway environment variables');
  console.log('5. Ensure your database is in the same Railway project as your application');
  console.log('\n');
  
  console.log('=== Manual Configuration Instructions ===');
  console.log('If automatic configuration fails, set these variables in Railway:');
  console.log('DATABASE_URL=postgresql://postgres:YtXeaamwlmLyWgQhjVkcMusInbHPydpB@postgres:5432/railway');
  console.log('PGHOST=postgres');
  console.log('PGUSER=postgres');
  console.log('PGPASSWORD=YtXeaamwlmLyWgQhjVkcMusInbHPydpB');
  console.log('PGDATABASE=railway');
  console.log('PGPORT=5432');
  console.log('PGSSLMODE=disable');
  console.log('\n');
}

// Run all checks
async function runAllChecks() {
  try {
    await runNetworkingTests();
    await testDatabaseUrl();
    await checkDatabaseSchema();
    provideRecommendations();
    
    console.log('===== Troubleshooting Complete =====');
  } catch (err) {
    console.error('Error during troubleshooting:', err);
  }
}

// Start checks
runAllChecks();