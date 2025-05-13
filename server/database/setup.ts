import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../shared/schema';
import { log } from '../vite';

// Configure WebSocket for Neon database connection
neonConfig.webSocketConstructor = ws;

// Create necessary directories
const DB_EXPORT_DIR = path.join(process.cwd(), 'database-export');
if (!fs.existsSync(DB_EXPORT_DIR)) {
  fs.mkdirSync(DB_EXPORT_DIR, { recursive: true });
}

// Database connection
if (!process.env.DATABASE_URL) {
  console.warn(
    "WARNING: DATABASE_URL is not set. Using a dummy connection for Railway deployment. The app will function in limited mode."
  );
  process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy_db?schema=public';
}

// Check if this is a dummy connection for Railway
const isDummyConnection = process.env.DATABASE_URL?.includes('dummy:dummy@localhost');

// Check if we need to use hardcoded Railway credentials
let connectionString = process.env.DATABASE_URL;
let isRailwayDirect = false;

// For Railway deployment with direct connection
if (process.env.RAILWAY_ENVIRONMENT) {
  log('Running in Railway environment, checking connection options', 'database');
  
  // Get Railway host - either from env var or fallback
  const railwayPrivateDomain = process.env.RAILWAY_PRIVATE_DOMAIN;
  const pgHost = process.env.PGHOST;
  
  // Check if we need to use the internal Railway networking
  if (railwayPrivateDomain && 
      (isDummyConnection || !connectionString || connectionString.includes('${{') || 
      !process.env.DATABASE_URL || connectionString.includes('loanmaster-1.railway.internal'))) {
    
    log(`Railway internal networking detected (${railwayPrivateDomain})`, 'database');
    
    // For Railway's internal networking, we need to use the service name
    // The format is: postgresql://postgres:password@postgres:5432/railway
    connectionString = 'postgresql://postgres:YtXeaamwlmLyWgQhjVkcMusInbHPydpB@postgres:5432/railway';
    isRailwayDirect = true;
    
    log('Using Railway internal networking connection: postgresql://postgres:****@postgres:5432/railway', 'database');
    
    // Set simplified host for internal networking
    process.env.PGHOST = 'postgres';
  }
}

// Create connection options with Railway-specific optimizations
const connectionOptions = {
  connectionString: connectionString,
  // Set reasonable timeouts
  connectionTimeoutMillis: isDummyConnection ? 1000 : 30000,
  // Reduce pooling for dummy connections
  max: isDummyConnection ? 1 : 10,
  idleTimeoutMillis: isDummyConnection ? 1000 : 30000,
  // Handle SSL properly for PostgreSQL connection
  ssl: isRailwayDirect || process.env.PGSSLMODE === 'disable' 
    ? false 
    : { rejectUnauthorized: false }, // Accept self-signed certificates
  allowExitOnIdle: process.env.PG_ALLOW_EXIT_IDLE === 'true' || isRailwayDirect
};

// Log connection info for debugging (without sensitive data)
console.log('PostgreSQL connection options:', {
  ...connectionOptions,
  connectionString: '******', // Never log connection string
  directConnection: isRailwayDirect,
  host: isRailwayDirect ? 'RAILWAY_PRIVATE_DOMAIN' : (process.env.PGHOST ? '******' : 'Not set'),
  ssl: connectionOptions.ssl,
  railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'Not set'
});

// Print detailed environment variables for easier debugging
log('=== Database Environment Variables ===', 'database');
log(`PGHOST = ${process.env.PGHOST || '(not set)'}`, 'database');
log(`PGPORT = ${process.env.PGPORT || '(not set)'}`, 'database');
log(`PGUSER = ${process.env.PGUSER ? 'Set (hidden)' : '(not set)'}`, 'database');
log(`PGPASSWORD = ${process.env.PGPASSWORD ? 'Set (hidden)' : '(not set)'}`, 'database');
log(`PGDATABASE = ${process.env.PGDATABASE || '(not set)'}`, 'database');
log(`PGSSLMODE = ${process.env.PGSSLMODE || '(not set)'}`, 'database');
log(`DATABASE_URL setup: host=${connectionOptions.connectionString ? 'Using connection string' : 'No connection string'}`, 'database');

// Create the pool with optimized options
export const pool = new Pool(connectionOptions);

export const db = drizzle(pool, { schema });

export async function setupDatabase() {
  // Special handling for Railway deployment with no database
  if (isDummyConnection && process.env.RAILWAY_ENVIRONMENT === 'production') {
    log('Running with dummy database connection for Railway deployment', 'database');
    log('The application will function in VIEW-ONLY mode', 'database');
    log('Please add a PostgreSQL database in Railway to enable full functionality', 'database');
    
    // Return the dummy connection objects
    return { pool, db };
  }
  
  // Log all PostgreSQL-related environment variables (without values)
  log('PostgreSQL environment variables:', 'database');
  Object.keys(process.env).filter(key => 
    key.startsWith('PG') || 
    key.startsWith('POSTGRES') || 
    key === 'DATABASE_URL'
  ).forEach(key => {
    log(`  ${key}: ${key === 'DATABASE_URL' ? '******' : process.env[key] ? 'Set' : 'Not set'}`, 'database');
  });
  
  let retries = 5;
  let lastError = null;
  
  while (retries > 0) {
    try {
      log(`Initializing database connection (attempts remaining: ${retries})...`, 'database');
      
      // Test database connection with timeout
      const client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 10000)
        )
      ]) as any;
      
      try {
        log('Database connection successful', 'database');
        
        // Check if any tables exist
        const { rows } = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        if (rows.length === 0) {
          log('No tables found in database, initializing schema...', 'database');
          // Initialize database schema using Drizzle
          await initializeSchema();
        } else {
          log(`Database already contains ${rows.length} tables`, 'database');
        }
        
        // Successfully connected and initialized
        return { pool, db };
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      console.error(`Database connection attempt failed (${retries} attempts remaining):`, error);
      
      // Decrease retry counter
      retries--;
      
      if (retries > 0) {
        // Wait before next attempt - exponential backoff
        const delay = Math.pow(2, 5 - retries) * 1000;
        log(`Retrying database connection in ${delay/1000} seconds...`, 'database');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we reach here, all retries failed
  console.error('All database connection attempts failed:', lastError);
  
  // For Railway deployment - don't crash the app, but log the error
  if (process.env.RAILWAY_ENVIRONMENT === 'production') {
    console.error('Running in production mode on Railway - continuing despite database errors');
    console.error('The application will function in VIEW-ONLY mode');
    console.error('Please add a PostgreSQL database in Railway to enable full functionality');
    return { pool, db };
  } else {
    throw lastError;
  }
}

async function initializeSchema() {
  try {
    // Use drizzle to push schema (this is safer)
    log('Pushing database schema using drizzle...', 'database');
    
    // For Railway deployments, we'll use a transaction to ensure all or nothing
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Extract table creation SQL from the schema
      const tablesSQL = generateTablesSQLFromSchema();
      
      // Execute each SQL statement within the transaction
      for (const sql of tablesSQL) {
        try {
          await client.query(sql);
          log(`Successfully executed: ${sql.substring(0, 50)}...`, 'database');
        } catch (error: any) {
          console.error(`Error executing SQL: ${sql}`, error);
          // Don't throw yet, but collect errors
          if (error.code === '42P07') {
            // Error code for "relation already exists"
            log(`Table already exists, continuing...`, 'database');
          } else {
            // For other errors, we'll roll back
            throw error;
          }
        }
      }
      
      // Commit the transaction if we got here
      await client.query('COMMIT');
      log('Database schema initialized successfully', 'database');
      
    } catch (error) {
      // Something went wrong, roll back
      await client.query('ROLLBACK');
      console.error('Transaction rolled back due to error:', error);
      
      // Try individual statements without transaction if we're on Railway
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        log('Retrying schema creation without transaction...', 'database');
        // Just try to create each table individually
        const tablesSQL = generateTablesSQLFromSchema();
        for (const sql of tablesSQL) {
          try {
            await pool.query(sql);
          } catch (err: any) {
            // Log but don't fail on table exists errors
            if (err.code === '42P07') {
              log(`Table already exists, continuing...`, 'database');
            } else {
              console.error(`Error creating table: ${err.message || 'Unknown error'}`);
            }
          }
        }
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error initializing database schema:', error);
    
    // Don't crash in Railway environment
    if (process.env.RAILWAY_ENVIRONMENT === 'production') {
      console.error('Continuing despite schema initialization errors in Railway environment');
    } else {
      throw error;
    }
  }
}

function generateTablesSQLFromSchema() {
  // This is a simplified approach - in a real app you'd want to use
  // drizzle-kit's existing migration tools, but this works for our purpose
  const tableSchemas = [
    // Create clients table
    `CREATE TABLE IF NOT EXISTS "clients" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL,
      "phone" text NOT NULL,
      "email" text,
      "address" text,
      "createdAt" timestamp DEFAULT now() NOT NULL
    );`,
    
    // Create loans table
    `CREATE TABLE IF NOT EXISTS "loans" (
      "id" serial PRIMARY KEY,
      "loanNumber" text NOT NULL,
      "clientId" integer NOT NULL REFERENCES "clients"("id"),
      "amount" text NOT NULL,
      "startDate" timestamp NOT NULL,
      "endDate" timestamp NOT NULL,
      "interestRate" text NOT NULL,
      "interestType" text NOT NULL,
      "termLength" integer NOT NULL,
      "termUnit" text NOT NULL,
      "repaymentFrequency" text NOT NULL,
      "lateFeePercentage" text NOT NULL,
      "preclosureFeePercentage" text NOT NULL,
      "status" text NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL
    );`,
    
    // Create installments table
    `CREATE TABLE IF NOT EXISTS "installments" (
      "id" serial PRIMARY KEY,
      "loanId" integer NOT NULL REFERENCES "loans"("id"),
      "installmentNumber" integer NOT NULL,
      "dueDate" timestamp NOT NULL,
      "principal" text NOT NULL,
      "interest" text NOT NULL,
      "totalDue" text NOT NULL,
      "remainingAmount" text NOT NULL,
      "status" text NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL
    );`,
    
    // Create payments table
    `CREATE TABLE IF NOT EXISTS "payments" (
      "id" serial PRIMARY KEY,
      "loanId" integer NOT NULL REFERENCES "loans"("id"),
      "installmentId" integer REFERENCES "installments"("id"),
      "amount" text NOT NULL,
      "paymentDate" timestamp NOT NULL,
      "paymentType" text NOT NULL,
      "paymentMethod" text NOT NULL,
      "lateFee" text NOT NULL,
      "preclosureFee" text NOT NULL,
      "notes" text,
      "createdAt" timestamp DEFAULT now() NOT NULL
    );`
  ];
  
  return tableSchemas;
}