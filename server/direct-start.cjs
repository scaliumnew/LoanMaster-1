// Direct start server script using CommonJS
// This script starts a basic server without requiring ESM modules
// Used as a fallback on Railway when the normal start fails

const express = require('express');
const path = require('path');
const fs = require('fs');

// Set up express
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets from the client/dist directory
const distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Add JSON parsing middleware
app.use(express.json());

// Health check endpoint (required for Railway)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'limited',
    message: 'Fallback server running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'unknown'
  });
});

// API fallback routes
app.get('/api/dashboard', (req, res) => {
  res.json({
    message: 'Fallback dashboard data',
    totalActiveLoans: 0,
    totalDisbursedAmount: 0,
    overduePaymentsCount: 0,
    recentLoans: [],
    upcomingInstallments: [],
    overdueInstallments: []
  });
});

app.get('/api/clients', (req, res) => {
  res.json([]);
});

app.get('/api/loans', (req, res) => {
  res.json([]);
});

// Special handler for Railway direct connection
if (process.env.RAILWAY_ENVIRONMENT === 'production') {
  console.log('Checking for Railway direct database connection options...');
  
  // Get Railway host
  const railwayHost = process.env.RAILWAY_PRIVATE_DOMAIN;
  
  if (railwayHost) {
    try {
      console.log(`Attempting direct database connection to ${railwayHost}...`);
      
      // Set up direct connection
      const { Pool } = require('pg');
      
      // Create connection with hardcoded credentials
      // Replace with your actual values if needed
      const pool = new Pool({
        user: 'postgres',
        password: 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB',
        host: railwayHost,
        port: 5432,
        database: 'railway',
        ssl: false
      });
      
      // Test connection
      pool.query('SELECT NOW()', (err, result) => {
        if (err) {
          console.error('Direct database connection failed:', err);
        } else {
          console.log('Direct database connection successful!', result.rows[0]);
          
          // Set DATABASE_URL for the rest of the application
          process.env.DATABASE_URL = `postgresql://postgres:YtXeaamwlmLyWgQhjVkcMusInbHPydpB@${railwayHost}:5432/railway`;
          console.log('Set DATABASE_URL with direct connection string');
        }
      });
    } catch (err) {
      console.error('Error setting up direct database connection:', err);
    }
  }
}

// Fallback for all other API routes
app.all('/api/*', (req, res) => {
  res.status(503).json({
    error: 'Database connection required',
    message: 'This feature requires a database connection',
    instructions: 'Please connect a PostgreSQL database in Railway and set the DATABASE_URL environment variable'
  });
});

// Serve index.html for client-side routing
app.get('*', (req, res) => {
  // Check if we have the client dist folder
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    // If no client dist, show a fallback page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loan Management System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f7f9fc;
            color: #333;
          }
          .container {
            max-width: 800px;
            margin: 40px auto;
            padding: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          h1 { color: #4f46e5; margin-top: 0; }
          .card {
            padding: 20px;
            background: #f0f4ff;
            border-radius: 6px;
            margin: 20px 0;
          }
          .error-card {
            background: #fff5f5;
            border-left: 4px solid #e11d48;
          }
          code {
            background: #1e293b;
            color: #e2e8f0;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
          .btn {
            display: inline-block;
            background: #4f46e5;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Loan Management System</h1>
          <div class="card error-card">
            <h2>Application Error</h2>
            <p>The application is running in fallback mode. The main application could not start properly.</p>
          </div>
          <div class="card">
            <h2>Required Environment Variables:</h2>
            <p>To fix this issue, add the following environment variables in Railway:</p>
            <ul>
              <li><strong>DATABASE_URL</strong> - PostgreSQL connection string</li>
              <li><strong>PGHOST</strong> - Database hostname</li>
              <li><strong>PGPORT</strong> - Database port (usually 5432)</li>
              <li><strong>PGUSER</strong> - Database username</li>
              <li><strong>PGPASSWORD</strong> - Database password</li>
              <li><strong>PGDATABASE</strong> - Database name</li>
            </ul>
          </div>
          <div class="card">
            <h2>How to add PostgreSQL in Railway:</h2>
            <ol>
              <li>Go to your project in Railway dashboard</li>
              <li>Click "New" → "Database" → "PostgreSQL"</li>
              <li>Once provisioned, the DATABASE_URL variable will be automatically set</li>
              <li>Redeploy your application</li>
            </ol>
          </div>
          <a class="btn" href="https://railway.app/dashboard" target="_blank">Go to Railway Dashboard</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fallback server running on port ${PORT}`);
  console.log('This is a limited functionality mode.');
  console.log('Please connect a PostgreSQL database to enable full functionality.');
  
  if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL environment variable is not set');
  }
});