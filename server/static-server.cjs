// Servidor estático standalone: serve o build do Vite (pasta dist/) na rede
// local, pra poder abrir tanto no PC quanto no celular. Roda tanto via
// `node server/static-server.cjs` quanto empacotado como .exe (pkg).
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT) || 8787;
const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Evita sair da pasta dist/ com "../"
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(400);
    res.end('Requisição inválida');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }
    // Rotas tipo /#/view já são hash (não chegam no servidor); qualquer
    // caminho sem arquivo correspondente cai no index.html.
    sendFile(res, path.join(DIST_DIR, 'index.html'));
  });
});

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('❌ Pasta "dist" não encontrada ou incompleta. Rode "npm run build" antes.');
  process.exit(1);
}

server.listen(PORT, '0.0.0.0', () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log('✅ OBS Controle Painel rodando!');
  console.log(`   Neste PC:    ${localUrl}`);
  for (const ip of getLocalIPs()) {
    console.log(`   No celular:  http://${ip}:${PORT}`);
  }
  console.log('\nFeche esta janela pra encerrar o servidor.');

  if (process.platform === 'win32') {
    exec(`start "" "${localUrl}"`);
  }
});
