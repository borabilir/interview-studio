const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const apiPort = Number(process.env.INTERVIEW_STUDIO_API_PORT || 5187)
let frontendServer

function proxyApi(request, response) {
  const proxy = http.request({
    hostname: '127.0.0.1',
    port: apiPort,
    path: request.url,
    method: request.method,
    headers: { ...request.headers, host: `127.0.0.1:${apiPort}` },
  }, (apiResponse) => {
    response.writeHead(apiResponse.statusCode ?? 502, apiResponse.headers)
    apiResponse.pipe(response)
  })
  proxy.on('error', () => {
    response.writeHead(502, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ title: 'API unavailable' }))
  })
  request.pipe(proxy)
}

function startFrontendServer() {
  const distDirectory = path.join(app.getAppPath(), 'dist')
  const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  }

  frontendServer = http.createServer((request, response) => {
    if (request.url?.startsWith('/api/')) {
      proxyApi(request, response)
      return
    }
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const requestedPath = path.normalize(path.join(distDirectory, pathname))
    const safePath = requestedPath.startsWith(distDirectory) && fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
      ? requestedPath
      : path.join(distDirectory, 'index.html')
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(safePath)] ?? 'application/octet-stream' })
    fs.createReadStream(safePath).pipe(response)
  })

  return new Promise((resolve) => {
    frontendServer.listen(0, '127.0.0.1', () => resolve(frontendServer.address().port))
  })
}

function createWindow(port) {
  const window = new BrowserWindow({
    width: 520,
    height: 760,
    minWidth: 380,
    minHeight: 420,
    transparent: true,
    opacity: 0.9,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    hasShadow: true,
    contentProtection: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.setContentProtection(true)
  window.setAlwaysOnTop(true, 'floating')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  void window.loadURL(`http://127.0.0.1:${port}/easy-mode?desktop=1`)
}

app.whenReady().then(async () => {
  const port = await startFrontendServer()
  createWindow(port)
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  frontendServer?.close()
})
