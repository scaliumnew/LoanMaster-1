// Fallback server for Railway deployment
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create client/dist directory if it doesn't exist
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (!fs.existsSync(clientDistPath)) {
  fs.mkdirSync(clientDistPath, { recursive: true });
}

// Create a minimal index.html if it doesn't exist
const indexHtmlPath = path.join(clientDistPath, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  fs.writeFileSync(indexHtmlPath, `
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
    <div class="card">
      <h2>Database Connection Required</h2>
      <p>This is a fallback page. The main application couldn't start properly.</p>
      <p>Please connect a PostgreSQL database to enable full functionality.</p>
      <p>Make sure the DATABASE_URL environment variable is set in Railway.</p>
    </div>
    <div class="card">
      <h2>Required Environment Variables:</h2>
      <ul>
        <li><strong>DATABASE_URL</strong> - PostgreSQL connection string</li>
        <li><strong>PGHOST</strong> - Database hostname</li>
        <li><strong>PGPORT</strong> - Database port (usually 5432)</li>
        <li><strong>PGUSER</strong> - Database username</li>
        <li><strong>PGPASSWORD</strong> - Database password</li>
        <li><strong>PGDATABASE</strong> - Database name</li>
      </ul>
    </div>
    <a class="btn" href="https://railway.app/dashboard" target="_blank">Go to Railway Dashboard</a>
  </div>
</body>
</html>
  `);
}

// Serve static files from the client directory
app.use(express.static(clientDistPath));

// Try to connect to the database using Railway internal networking
let dbConnectionInfo = "Not attempted";
let dbStatus = "unknown";

if (process.env.RAILWAY_ENVIRONMENT) {
  try {
    console.log("Attempting to connect to database using Railway internal networking...");
    const { Pool } = require('pg');
    
    // Create a connection pool using the service name
    const pool = new Pool({
      user: 'postgres',
      password: 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB',
      host: 'postgres',
      port: 5432,
      database: 'railway',
      ssl: false,
      connectionTimeoutMillis: 5000
    });
    
    // Try a simple query
    pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error("Database connection test failed:", err.message);
        dbConnectionInfo = `Connection error: ${err.message}`;
        dbStatus = "failed";
      } else {
        console.log("Database connection test succeeded:", result.rows[0]);
        dbConnectionInfo = `Connected to database. Server time: ${result.rows[0].now}`;
        dbStatus = "connected";
        
        // Set environment variables for the rest of the application
        process.env.DATABASE_URL = 'postgresql://postgres:YtXeaamwlmLyWgQhjVkcMusInbHPydpB@postgres:5432/railway';
        process.env.PGHOST = 'postgres';
        process.env.PGUSER = 'postgres';
        process.env.PGPASSWORD = 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB';
        process.env.PGDATABASE = 'railway';
        process.env.PGPORT = '5432';
        process.env.PGSSLMODE = 'disable';
      }
    });
  } catch (err) {
    console.error("Error testing database connection:", err);
    dbConnectionInfo = `Error: ${err.message}`;
    dbStatus = "error";
  }
}

// Health check endpoint with connection diagnostics
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'limited', 
    message: 'Service is running in fallback mode', 
    error: 'Database connection issues',
    databaseStatus: dbStatus,
    databaseInfo: dbConnectionInfo,
    envVars: {
      railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'Not set',
      railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN || 'Not set',
      databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
      pgHost: process.env.PGHOST || 'Not set',
      pgPort: process.env.PGPORT || 'Not set',
      pgSslMode: process.env.PGSSLMODE || 'Not set'
    },
    time: new Date().toISOString() 
  });
});

// Database debug endpoint
app.get('/api/debug/database', (req, res) => {
  const connectionTests = [];
  
  // Test various connection methods
  const testHosts = [
    { name: 'Internal service name "postgres"', host: 'postgres', port: '5432' },
    { name: 'RAILWAY_PRIVATE_DOMAIN', host: process.env.RAILWAY_PRIVATE_DOMAIN, port: '5432' },
    { name: 'PGHOST', host: process.env.PGHOST, port: process.env.PGPORT || '5432' },
  ];
  
  // Run tests
  let testsCompleted = 0;
  const totalTests = testHosts.filter(h => h.host).length;
  
  if (totalTests === 0) {
    return res.json({
      status: 'error',
      message: 'No hosts available to test',
      environment: {
        railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'Not set',
        railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN || 'Not set',
        pgHost: process.env.PGHOST || 'Not set'
      }
    });
  }
  
  for (const config of testHosts) {
    if (!config.host) continue;
    
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        user: 'postgres',
        password: 'YtXeaamwlmLyWgQhjVkcMusInbHPydpB',
        host: config.host,
        port: parseInt(config.port, 10),
        database: 'railway',
        ssl: false,
        connectionTimeoutMillis: 5000
      });
      
      pool.query('SELECT NOW()', (err, result) => {
        testsCompleted++;
        
        if (err) {
          connectionTests.push({
            name: config.name,
            host: config.host,
            port: config.port,
            status: 'failed',
            error: err.message
          });
        } else {
          connectionTests.push({
            name: config.name,
            host: config.host,
            port: config.port,
            status: 'success',
            serverTime: result.rows[0].now
          });
        }
        
        // If all tests complete, send response
        if (testsCompleted === totalTests) {
          res.json({
            status: 'completed',
            tests: connectionTests,
            environment: {
              railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'Not set',
              railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN || 'Not set',
              databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
              pgHost: process.env.PGHOST || 'Not set',
              pgPort: process.env.PGPORT || 'Not set'
            },
            systemTime: new Date().toISOString()
          });
        }
      });
    } catch (err) {
      testsCompleted++;
      connectionTests.push({
        name: config.name,
        host: config.host,
        port: config.port,
        status: 'error',
        error: err.message
      });
      
      // If all tests complete, send response
      if (testsCompleted === totalTests) {
        res.json({
          status: 'completed',
          tests: connectionTests,
          environment: {
            railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'Not set',
            railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN || 'Not set',
            databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
            pgHost: process.env.PGHOST || 'Not set',
            pgPort: process.env.PGPORT || 'Not set'
          },
          systemTime: new Date().toISOString()
        });
      }
    }
  }
});

// API endpoints
app.get('/api/*', (req, res) => {
  if (req.path === '/api/debug/database') return; // Already handled
  
  res.json({ 
    error: 'Database connection required',
    message: 'This is a fallback API response. Please connect a PostgreSQL database to enable full functionality.',
    help: 'Try the /api/health or /api/debug/database endpoints for diagnostics'
  });
});

// Serve the SPA for any other route
app.get('*', (req, res) => {
  res.sendFile(indexHtmlPath);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FALLBACK SERVER running on port ${PORT}`);
  console.log('WARNING: Running in fallback mode without database connection');
  console.log('Please connect a PostgreSQL database to enable full functionality');
});