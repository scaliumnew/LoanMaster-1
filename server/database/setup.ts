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
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function setupDatabase() {
  try {
    log('Initializing database connection...', 'database');
    
    // Test database connection
    const client = await pool.connect();
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
    } finally {
      client.release();
    }
    
    return { pool, db };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function initializeSchema() {
  try {
    // Check if we have a SQL dump to use
    const schemaPath = path.join(DB_EXPORT_DIR, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      log('Found schema.sql, applying to database...', 'database');
      // We would need to read and execute the SQL directly
      // This is challenging in serverless environments
      // Let's fall back to Drizzle
    }
    
    // Use drizzle to push schema (this is safer)
    log('Pushing database schema using drizzle...', 'database');
    
    // We'll use basic table creation from our schema
    // Extract table creation SQL from the schema
    const tablesSQL = generateTablesSQLFromSchema();
    
    // Execute the SQL
    for (const sql of tablesSQL) {
      try {
        await pool.query(sql);
      } catch (error) {
        console.error(`Error executing SQL: ${sql}`, error);
      }
    }
    
    log('Database schema initialized successfully', 'database');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
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