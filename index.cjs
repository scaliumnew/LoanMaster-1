// Entry point for Railway deployment
// This file is compatible with CommonJS and doesn't require ESM mode

// Set production mode
process.env.NODE_ENV = 'production';

try {
  // Check if we're in production
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    console.log('Starting application in production mode on Railway...');
    
    // Check for required directories
    const fs = require('fs');
    const path = require('path');
    
    // Create necessary directories if they don't exist
    ['dist', 'database-export', 'client/dist'].forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    // Check if dist/index.js exists
    if (fs.existsSync(path.join(__dirname, 'dist', 'index.js'))) {
      // Import ESM module - in production this should be the bundled server
      console.log('Starting main server...');
      // We need to dynamically import ESM modules
      import('./dist/index.js').catch(err => {
        console.error('Error importing dist/index.js:', err);
        console.log('Falling back to direct server execution...');
        require('./server/direct-start.cjs');
      });
    } else {
      console.warn('dist/index.js not found, using fallback server');
      require('./server/direct-start.cjs');
    }
  } else {
    // In development, we should not be using this file
    console.log('This entry point is intended for production use only.');
    console.log('For development, use: npm run dev');
    process.exit(1);
  }
} catch (err) {
  console.error('Error starting application:', err);
  
  // Try fallback server as last resort
  try {
    console.log('Attempting to start fallback server...');
    const express = require('express');
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    app.get('/api/health', (req, res) => {
      res.json({ status: 'limited', message: 'Fallback server running' });
    });
    
    app.get('*', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Loan Management System - Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; line-height: 1.5; }
            .container { max-width: 800px; margin: 0 auto; }
            h1 { color: #e11d48; }
            .card { padding: 1rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Application Error</h1>
            <div class="card">
              <p>The application could not start properly. This is likely due to missing database configuration.</p>
              <p>Please make sure you have connected a PostgreSQL database in Railway and set the DATABASE_URL environment variable.</p>
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
    console.error('Even fallback server failed:', fallbackErr);
    process.exit(1);
  }
}