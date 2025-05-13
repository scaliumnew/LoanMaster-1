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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'limited', 
    message: 'Service is running in fallback mode', 
    error: 'No database connection',
    time: new Date().toISOString() 
  });
});

// API endpoints
app.get('/api/*', (req, res) => {
  res.json({ 
    error: 'Database connection required',
    message: 'This is a fallback API response. Please connect a PostgreSQL database to enable full functionality.'
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