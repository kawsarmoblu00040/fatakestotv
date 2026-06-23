const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'requests.json');

// Initialize local JSON database
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

function getRequests() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveRequests(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Endpoints
  if (req.url === '/api/submit-request' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { headline, date, image } = JSON.parse(body);
        if (!image || !headline) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing image or headline' }));
          return;
        }

        // Generate a mock unique request
        const newRequest = {
          id: Math.random().toString(36).substring(2, 11),
          headline,
          date: date || 'আজকের তারিখ',
          image_url: image, // Use base64 locally so it displays instantly
          status: 'pending',
          created_at: new Date().toISOString()
        };

        const db = getRequests();
        db.push(newRequest);
        saveRequests(db);

        console.log(`[TEST SERVER] New request submitted: "${headline}"`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, request: newRequest }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    return;
  }

  if (req.url === '/api/get-requests' && req.method === 'GET') {
    // In local test server, we bypass admin password check for easy testing, or check if present
    const db = getRequests().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, requests: db }));
    return;
  }

  if (req.url === '/api/publish-post' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        const db = getRequests();
        const requestIndex = db.findIndex(r => r.id === id);

        if (requestIndex === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request not found' }));
          return;
        }

        db[requestIndex].status = 'posted';
        saveRequests(db);

        console.log(`[TEST SERVER] Mock posted request ${id} to Facebook Page!`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, fb_post_id: 'mock_fb_post_id_12345', request: db[requestIndex] }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    return;
  }

  if (req.url === '/api/delete-request' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        let db = getRequests();
        const exists = db.some(r => r.id === id);

        if (!exists) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request not found' }));
          return;
        }

        db = db.filter(r => r.id !== id);
        saveRequests(db);

        console.log(`[TEST SERVER] Deleted request ${id}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Deleted successfully' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Strip query parameters
  filePath = filePath.split('?')[0];

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[FATAKESTO TV] TEST SERVER RUNNING AT: http://localhost:${PORT}`);
  console.log(`- Open this link in your browser to test the website locally.`);
  console.log(`- Navigate to http://localhost:${PORT}/admin.html to see the Admin Dashboard.`);
  console.log(`- Close this terminal (Ctrl+C) to stop the server.`);
  console.log(`=======================================================`);
});
