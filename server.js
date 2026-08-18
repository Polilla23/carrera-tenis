// Mini servidor estatico para desarrollo (node server.js)
var http = require('http');
var fs = require('fs');
var path = require('path');
var root = __dirname;
var MIME = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
            '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json'};
http.createServer(function(req, res){
  var p = decodeURIComponent(req.url.split('?')[0]);
  if(p === '/') p = '/index.html';
  var file = path.join(root, p);
  if(!file.startsWith(root)){ res.writeHead(403); res.end(); return; }
  fs.readFile(file, function(err, data){
    if(err){ res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8123, function(){ console.log('http://localhost:8123'); });
