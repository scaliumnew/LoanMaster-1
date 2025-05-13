#!/usr/bin/env node

// This script handles Railway deployment startup
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("=== Railway Deployment Startup Script ===");

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

// Create necessary directories
ensureDirectoryExists("./dist");
ensureDirectoryExists("./database-export");

// Function to check if we're in production environment
function isProduction() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT === "production"
  );
}

// Create environment variables for Railway connection
if (isProduction()) {
  console.log("Checking database connection for Railway...");
  
  // Check if we need to use Railway's internal networking
  if (!process.env.DATABASE_URL || 
      process.env.DATABASE_URL.includes('${{') || 
      process.env.DATABASE_URL.includes('.railway.internal')) {
    
    console.log("Setting up Railway internal networking connection");
    
    // Use the service name "postgres" for internal networking instead of domain name
    process.env.DATABASE_URL = "postgresql://postgres:YtXeaamwlmLyWgQhjVkcMusInbHPydpB@postgres:5432/railway";
    process.env.PGHOST = "postgres"; // Use service name
    process.env.PGPORT = "5432";
    process.env.PGUSER = "postgres";
    process.env.PGPASSWORD = "YtXeaamwlmLyWgQhjVkcMusInbHPydpB";
    process.env.PGDATABASE = "railway";
    process.env.PGSSLMODE = "disable"; // Disable SSL for internal networking
    
    console.log("DATABASE_URL set to use Railway internal networking");
    console.log("PGHOST set to 'postgres' for service-to-service communication");
  }
}

// Create a fallback index.js in the dist folder if it doesn't exist
const distIndexPath = path.join(__dirname, "dist", "index.js");
if (!fs.existsSync(distIndexPath)) {
  console.log("Creating fallback dist/index.js");
  const fallbackCode = `
// Fallback server for Railway deployment
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Service is running', time: new Date().toISOString() });
});

// API endpoints
app.get('/api/*', (req, res) => {
  res.json({ 
    error: 'Database connection required',
    message: 'This is a placeholder API response. Please connect a PostgreSQL database to enable full functionality.'
  });
});

// Serve the SPA for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Application running on port \${PORT}\`);
  console.log('WARNING: Running in fallback mode without database connection');
});
`;

  ensureDirectoryExists(path.dirname(distIndexPath));
  fs.writeFileSync(distIndexPath, fallbackCode);
}

// Check for proper build - make sure client dist exists
const clientDistPath = path.join(__dirname, "client", "dist");
if (!fs.existsSync(clientDistPath)) {
  console.log("Creating fallback client/dist directory");
  ensureDirectoryExists(clientDistPath);

  // Create a minimal index.html
  const indexHtmlPath = path.join(clientDistPath, "index.html");
  fs.writeFileSync(
    indexHtmlPath,
    `
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
      <p>Please connect a PostgreSQL database to enable full functionality.</p>
      <p>In Railway.com, add a PostgreSQL plugin to your project and make sure the DATABASE_URL environment variable is set.</p>
    </div>
    <a class="btn" href="https://railway.app/dashboard" target="_blank">Go to Railway Dashboard</a>
  </div>
</body>
</html>
  `,
  );
}

// Now start the application
console.log("Starting application...");

try {
  // Check if dist/index.js exists, if not just run node directly
  if (fs.existsSync(path.join(__dirname, "dist", "index.js"))) {
    require("./dist/index.js");
  } else {
    console.log("WARNING: dist/index.js not found, using fallback server");
    require("./railway-fallback-server.js");
  }
} catch (err) {
  console.error("Error starting application:", err);
  process.exit(1);
}
