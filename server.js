/**
 * Simple HTTP Server for Intune Onboarding
 * Serves the onboarding portal and allows users to download setup scripts
 *
 * Usage: node server.js
 * Then navigate to http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || 'localhost';

// MIME type mappings
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.bat': 'application/x-msdownload',
    '.ps1': 'text/plain',
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // Default to index.html if root is requested
    if (pathname === '/') {
        pathname = '/onboarding.html';
    }

    // Remove leading slash and prevent directory traversal
    const fileName = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, fileName);

    // Security: ensure file is within current directory
    if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Access denied');
        return;
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end('<h1>404 Not Found</h1><p>The requested file was not found.</p>', 'utf-8');
            return;
        }

        // Get file extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = mimeTypes[ext] || 'application/octet-stream';

        // Set headers for download
        if (ext === '.bat' || ext === '.ps1') {
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
        }

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', stats.size);

        // Stream the file
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);

        stream.on('error', (error) => {
            console.error(`Error reading file ${filePath}:`, error);
            res.statusCode = 500;
            res.end('Internal server error');
        });
    });
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║  Intune Onboarding Server Started                     ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
    console.log(`📍 Server running at:`);
    console.log(`   http://${HOSTNAME}:${PORT}`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`\n📋 Available endpoints:`);
    console.log(`   GET  /onboarding.html          - Main onboarding portal`);
    console.log(`   GET  /Intune-Onboarding.ps1    - PowerShell script`);
    console.log(`   GET  /Intune-Onboarding-Launcher.bat - Batch launcher\n`);
    console.log(`Press CTRL+C to stop the server\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use.`);
        console.error(`Try: node server.js --port ${PORT + 1}`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n\nServer shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
