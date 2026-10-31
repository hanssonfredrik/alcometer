// Serves the marketing page (web/marketing/) locally, with no build step.
// Usage: npm run marketing (http://localhost:8742). Pass a port to override:
// npm run marketing -- 9000. The /privacy redirect only exists in Azure.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, normalize } from 'node:path'

const root = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'web',
  'marketing',
)
const port = Number(process.argv[2]) || 8742
const types = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path.endsWith('/')) path += 'index.html'
  const file = normalize(join(root, path))
  if (!file.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found')
  }
}).listen(port, () => console.log(`Marketing page: http://localhost:${port}/`))
