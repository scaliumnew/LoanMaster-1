#!/usr/bin/env node

// Entry point for Railway deployment - CommonJS version
// This avoids ESM import/require issues on Railway

// Set production mode
process.env.NODE_ENV = 'production';

// Check if we're in a Railway environment
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('Detected Railway environment');
  
  // Try direct database connection if environment variables aren't properly set
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('${{')) {
    console.log('DATABASE_URL not properly set, attempting direct connection...');
    
    // Check for Railway host
    const railwayHost = process.env.RAILWAY_PRIVATE_DOMAIN;
    
    if (railwayHost) {
      console.log(`Found Railway host: ${railwayHost}`);
      // Construct the direct connection URL
      // Replace these values with your actual credentials if needed
      process.env.DATABASE_URL = `postgresql://postgres:YtXeaamwlmLyWgQhjVkcMusInbHPydpB@${railwayHost}:5432/railway`;
      process.env.PGSSLMODE = 'disable';
      
      // Set other PostgreSQL variables
      process.env.PGUSER = 'postgres';
      process.env.PGPASSWORD = 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB';
      process.env.PGHOST = railwayHost;
      process.env.PGPORT = '5432';
      process.env.PGDATABASE = 'railway';
      
      console.log('Set direct database connection variables');
    }
  }
}

try {
  // Check for required directories
  const fs = require('fs');
  const path = require('path');
  const express = require('express');
  
  console.log('Starting Loan Management System (Railway deployment)');
  
  // Create necessary directories if they don't exist
  ['dist', 'database-export', 'client/dist'].forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Log important environment variables (without sensitive values)
  console.log('Environment variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '(set)' : '(not set)');
  console.log('PGHOST:', process.env.PGHOST || '(not set)');
  console.log('RAILWAY_PRIVATE_DOMAIN:', process.env.RAILWAY_PRIVATE_DOMAIN || '(not set)');
  console.log('PGSSLMODE:', process.env.PGSSLMODE || '(not set)');
  
  // Check if dist/index.js exists (built ESM app)
  const mainServerPath = path.join(__dirname, 'dist', 'index.js');
  const directStartPath = path.join(__dirname, 'server', 'direct-start.cjs');
  
  if (fs.existsSync(mainServerPath)) {
    // Main application exists, start it
    console.log('Starting main application server...');
    
    // We can't use import() in CommonJS, so we'll use the direct start server
    console.log('Executing direct start server...');
    require(directStartPath);
  } else {
    console.warn('Main application server not found, using fallback server');
    require(directStartPath);
  }
} catch (err) {
  console.error('Error starting application:', err);
  
  // Try emergency fallback server as last resort
  try {
    console.log('Attempting to start emergency fallback server...');
    const express = require('express');
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'emergency', 
        message: 'Emergency fallback server running',
        error: err.message || 'Unknown error'
      });
    });
    
    app.get('*', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Loan Management System - Emergency Mode</title>
          <style>
            body { font-family: system-ui; padding: 2rem; line-height: 1.5; background: #fffbeb; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            h1 { color: #d97706; }
            .card { padding: 1rem; border: 1px solid #fcd34d; background: #fef3c7; border-radius: 4px; margin-bottom: 1rem; }
            .error { background: #fee2e2; border-color: #fca5a5; }
            pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 4px; overflow: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Emergency Fallback Mode</h1>
            <div class="card">
              <p>The application is running in emergency fallback mode. This is a minimal server to keep the application available.</p>
              <p>Please make sure you have connected a PostgreSQL database in Railway and set the DATABASE_URL environment variable.</p>
            </div>
            <div class="card error">
              <h3>Error Details:</h3>
              <pre>${err.stack || err.message || 'Unknown error'}</pre>
            </div>
            <div class="card">
              <h3>Required Variables:</h3>
              <ul>
                <li><strong>DATABASE_URL</strong> - PostgreSQL connection string</li>
                <li><strong>PGHOST</strong> - Database hostname</li>
                <li><strong>PGPORT</strong> - Database port</li>
                <li><strong>PGUSER</strong> - Database username</li>
                <li><strong>PGPASSWORD</strong> - Database password</li>
                <li><strong>PGDATABASE</strong> - Database name</li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `);
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`EMERGENCY fallback server running on port ${PORT}`);
    });
  } catch (fallbackErr) {
    console.error('Even emergency fallback server failed:', fallbackErr);
    process.exit(1);
  }
}