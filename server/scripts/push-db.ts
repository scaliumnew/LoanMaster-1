import { db } from "../db";
import * as schema from "../../shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function pushDb() {
  console.log("Pushing schema to database...");
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const drizzleDb = drizzle(pool, { schema });
  
    console.log("Connected to the database, creating tables if they don't exist...");
    
    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "address" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create loans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "loans" (
        "id" SERIAL PRIMARY KEY,
        "loan_number" TEXT NOT NULL UNIQUE,
        "client_id" INTEGER NOT NULL REFERENCES "clients" ("id"),
        "amount" DECIMAL(12,2) NOT NULL,
        "start_date" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP NOT NULL,
        "interest_rate" DECIMAL(5,2) NOT NULL,
        "interest_type" TEXT NOT NULL,
        "term_length" INTEGER NOT NULL,
        "term_unit" TEXT NOT NULL,
        "repayment_frequency" TEXT NOT NULL,
        "late_fee_percentage" DECIMAL(5,2) NOT NULL,
        "preclosure_fee_percentage" DECIMAL(5,2) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create installments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "installments" (
        "id" SERIAL PRIMARY KEY,
        "loan_id" INTEGER NOT NULL REFERENCES "loans" ("id"),
        "installment_number" INTEGER NOT NULL,
        "due_date" TIMESTAMP NOT NULL,
        "principal" DECIMAL(12,2) NOT NULL,
        "interest" DECIMAL(12,2) NOT NULL,
        "total_due" DECIMAL(12,2) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "remaining_amount" DECIMAL(12,2) NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("loan_id", "installment_number")
      );
    `);
    
    // Create payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" SERIAL PRIMARY KEY,
        "loan_id" INTEGER NOT NULL REFERENCES "loans" ("id"),
        "installment_id" INTEGER REFERENCES "installments" ("id"),
        "amount" DECIMAL(12,2) NOT NULL,
        "payment_date" TIMESTAMP NOT NULL,
        "payment_type" TEXT NOT NULL,
        "payment_method" TEXT NOT NULL,
        "late_fee" DECIMAL(12,2) DEFAULT 0,
        "preclosure_fee" DECIMAL(12,2) DEFAULT 0,
        "notes" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Database schema pushed successfully!");
    await pool.end();
  } catch (error) {
    console.error("Error pushing schema to database:", error);
  }
}

pushDb();