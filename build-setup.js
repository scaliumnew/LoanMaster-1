// This script runs before the build to prepare necessary files
const fs = require('fs');
const path = require('path');

console.log('Setting up build environment...');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory');
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a railways-config.json file to signal we're in a Railway environment
fs.writeFileSync(
  path.join(__dirname, 'railway-config.json'), 
  JSON.stringify({ 
    environment: 'railway', 
    timestamp: new Date().toISOString() 
  }, null, 2)
);

// Copy our CommonJS files to the dist directory
const filesToCopy = [
  { src: 'index.cjs', dest: 'dist/index.cjs' },
  { src: 'server/direct-start.cjs', dest: 'dist/direct-start.cjs' }
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file.src)) {
    console.log(`Copying ${file.src} to ${file.dest}`);
    const destDir = path.dirname(file.dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(file.src, file.dest);
  } else {
    console.warn(`Warning: ${file.src} not found, skipping copy`);
  }
});

console.log('Build setup completed');