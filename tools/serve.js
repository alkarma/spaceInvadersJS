// A static file server for local development, on Node's own http module so the
// project keeps its zero dependencies. `python3 -m http.server` also works, but
// it resets connections when the page asks for the modules and all the sprites
// at once, which leaves the game half-loaded.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.ico': 'image/x-icon',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
};

function resolve(urlPath) {
	const decoded = decodeURIComponent(urlPath.split('?')[0]);
	const relative = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
	const full = join(ROOT, relative);
	// Never serve anything outside the project directory.
	if (!full.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep) && full !== ROOT) return null;
	return full;
}

const server = createServer(async (req, res) => {
	let path = resolve(req.url === '/' ? '/index.html' : req.url);
	if (!path) {
		res.writeHead(403).end('Forbidden');
		return;
	}
	try {
		let info = await stat(path);
		if (info.isDirectory()) {
			path = join(path, 'index.html');
			info = await stat(path);
		}
		res.writeHead(200, {
			'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
			'Content-Length': info.size,
			'Cache-Control': 'no-cache',
		});
		createReadStream(path).pipe(res);
	} catch {
		res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
	}
});

server.listen(PORT, () => {
	console.log('Space Invaders on http://localhost:' + PORT);
});
