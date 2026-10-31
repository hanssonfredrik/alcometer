// Serves the marketing page (web/marketing/) locally, with no build step.
// Usage: npm run marketing (http://localhost:8742). Pass a port to override:
// npm run marketing -- 9000. The /privacy redirect only exists in Azure.
// Mirrors Azure Static Web Apps where it matters for SEO checks: a folder
// without a trailing slash redirects to the slash URL, and a missing file
// gets 404.html with status 404.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
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
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

const isDir = (p) =>
  stat(p).then(
    (s) => s.isDirectory(),
    () => false,
  )

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  let path = decodeURIComponent(url.pathname)
  const file0 = normalize(join(root, path))
  if (!file0.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  if (!path.endsWith('/') && (await isDir(file0))) {
    res.writeHead(301, { location: path + '/' + url.search }).end()
    return
  }
  if (path.endsWith('/')) path += 'index.html'
  const file = normalize(join(root, path))
  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
    })
    res.end(body)
  } catch {
    try {
      const body = await readFile(join(root, '404.html'))
      res.writeHead(404, { 'content-type': types['.html'] }).end(body)
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found')
    }
  }
}).listen(port, () => console.log(`Marketing page: http://localhost:${port}/`))
