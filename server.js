#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const qrcode = require('qrcode-terminal');

const PORT = 8000;

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    const localURL = `http://localhost:${PORT}`;
    const networkURL = `http://${localIP}:${PORT}`;
    const index2URL = `http://${localIP}:${PORT}/index2.html`;

    console.log('🚀 Starting server...\n');
    console.log('📱 Access URLs:');
    console.log(`   Local:    ${localURL}`);
    console.log(`   Network:  ${networkURL}`);
    console.log(`   Index2:   ${index2URL}\n`);

    console.log('📱 QR Code for Network URL:');
    qrcode.generate(networkURL, { small: true });
    
    console.log('\n🛑 Press Ctrl+C to stop\n');
});