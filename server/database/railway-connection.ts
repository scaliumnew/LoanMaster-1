/**
 * Railway PostgreSQL Connection Helper
 * 
 * This file provides a direct connection to Railway PostgreSQL
 * when environment variables aren't being resolved correctly.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { log } from "../vite";

// Configure websocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Function to create Railway connection using direct values if needed
export function createRailwayConnection() {
  // First try standard environment variable
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && !databaseUrl.includes('${{') && !databaseUrl.includes('dummy:dummy')) {
    log('Using DATABASE_URL environment variable', 'database');
    return createConnectionFromUrl(databaseUrl);
  }
  
  // Try to construct from individual variables
  const pgUser = process.env.PGUSER || process.env.POSTGRES_USER;
  const pgPassword = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const pgHost = process.env.PGHOST || process.env.RAILWAY_PRIVATE_DOMAIN;
  const pgPort = process.env.PGPORT || '5432';
  const pgDatabase = process.env.PGDATABASE || process.env.POSTGRES_DB;
  
  if (pgUser && pgPassword && pgHost && pgDatabase) {
    const constructedUrl = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
    log('Constructed DATABASE_URL from individual variables', 'database');
    return createConnectionFromUrl(constructedUrl);
  }
  
  // Railway fallback with hardcoded values (for development/testing only)
  // You should replace these with your actual values
  const railwayUser = 'postgres';
  const railwayPassword = 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB'; // Replace with your actual password
  const railwayHost = process.env.RAILWAY_PRIVATE_DOMAIN; // This should be resolved at runtime
  const railwayDb = 'railway';
  
  if (process.env.RAILWAY_ENVIRONMENT && railwayHost) {
    const railwayUrl = `postgresql://${railwayUser}:${railwayPassword}@${railwayHost}:5432/${railwayDb}`;
    log('Using hardcoded Railway connection for emergency fallback', 'database');
    return createConnectionFromUrl(railwayUrl);
  }
  
  // If all else fails, create a dummy connection for development
  log('No valid database connection could be established. Using dummy connection.', 'database');
  return createDummyConnection();
}

// Helper function to create connection from URL
function createConnectionFromUrl(connectionUrl: string) {
  try {
    const sslMode = process.env.PGSSLMODE === 'disable' ? false : undefined;
    
    // Log connection info (without sensitive parts)
    const urlParts = new URL(connectionUrl);
    log(`Connecting to PostgreSQL at ${urlParts.host}/${urlParts.pathname.substring(1)}`, 'database');
    log(`SSL mode: ${sslMode === false ? 'disabled' : 'enabled/default'}`, 'database');
    
    // Create the connection pool
    const pool = new Pool({ 
      connectionString: connectionUrl,
      ssl: sslMode,
      connectionTimeoutMillis: 30000,
      max: 10
    });
    
    // Create Drizzle ORM instance
    const db = drizzle(pool, { schema });
    
    return { pool, db };
  } catch (err) {
    console.error('Error creating database connection:', err);
    return createDummyConnection();
  }
}

// Create a dummy connection for development/testing
function createDummyConnection() {
  const dummyUrl = 'postgresql://dummy:dummy@localhost:5432/dummy_db';
  const pool = new Pool({ 
    connectionString: dummyUrl,
    max: 1,
    connectionTimeoutMillis: 1000,
    idleTimeoutMillis: 1000
  });
  const db = drizzle(pool, { schema });
  return { pool, db };
}