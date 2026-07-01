var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 8080;

var MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

var server = http.createServer(function (req, res) {
  var url = req.url === '/' ? '/index.html' : req.url;
  var filePath = path.join(__dirname, url.split('?')[0]);
  var ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(PORT, function () {
  console.log('Custom Fields Power-Up server running at http://localhost:' + PORT);
});
