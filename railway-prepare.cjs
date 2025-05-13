#!/usr/bin/env node

// CommonJS version of the build setup script
const fs = require('fs');
const path = require('path');

console.log('Setting up Railway deployment environment...');

// Ensure necessary directories exist
['dist', 'database-export', 'client/dist'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Create a railway-config.json file for environment detection
fs.writeFileSync(
  path.join(__dirname, 'railway-config.json'), 
  JSON.stringify({ 
    environment: 'railway', 
    timestamp: new Date().toISOString() 
  }, null, 2)
);

// Create a .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file with fallback variables');
  fs.writeFileSync(
    envPath, 
    'NODE_ENV=production\nRAILWAY_ENVIRONMENT=production\n'
  );
}

// Create a fallback index.html
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (!fs.existsSync(clientDistPath)) {
  fs.mkdirSync(clientDistPath, { recursive: true });
}
const indexHtmlPath = path.join(clientDistPath, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.log('Creating fallback index.html');
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
  </style>
</head>
<body>
  <div class="container">
    <h1>Loan Management System</h1>
    <div class="card">
      <p>This is a fallback page. The application will be available after build completes.</p>
    </div>
  </div>
</body>
</html>
  `);
}

console.log('Railway deployment preparation complete');