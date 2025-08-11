// electron/main.js (ESM, works with "type": "module")
import { app as electronApp, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import { existsSync, createWriteStream, promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'
import https from 'node:https'

let mainWindow
let bbmpProc = null

const NUXT_DEV = process.env.NUXT_DEV === '1'
const NUXT_URL = 'http://localhost:3000'

function getUserDir() {
  return electronApp.getPath('userData')
}
function jarPath(versionTag = 'latest') {
  return join(getUserDir(), `BlueBerryMinecraftProxy-${versionTag}.jar`)
}
function preloadPath() {
  const base = electronApp.isPackaged ? process.resourcesPath : process.cwd()
  return join(base, 'electron', 'preload.js')
}

async function fetchJSON(url) {
  return await new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BBMP-Launcher' } }, res => {
      let data = ''
      res.on('data', d => (data += d))
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
    }).on('error', reject)
  })
}

// Accept ANY .jar asset from latest release
async function getLatestRelease() {
  const api = 'https://api.github.com/repos/BlueBerryCodingGroup/BBMP/releases/latest'
  const json = await fetchJSON(api)
  const asset = (json.assets || []).find(a => /\.jar$/i.test(a.name))
  if (!asset) {
    const names = (json.assets || []).map(a => a.name).join(', ')
    throw new Error('No jar asset found in latest release. Assets: ' + names)
  }
  return { tag: json.tag_name || 'latest', url: asset.browser_download_url, name: asset.name }
}

async function download(url, dest, onProgress) {
  await fs.mkdir(join(dest, '..'), { recursive: true }).catch(() => {})
  return await new Promise((resolve, reject) => {
    https.get(url, res => {
      // Handle redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest, onProgress).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode))
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let done = 0
      const file = createWriteStream(dest)
      res.on('data', chunk => {
        done += chunk.length
        if (onProgress && total) onProgress(done / total)
      })
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve(dest)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function ensureJar() {
  const latest = await getLatestRelease()
  const p = jarPath(latest.tag)
  if (existsSync(p)) return { path: p, version: latest.tag }
  await download(latest.url, p, prog => mainWindow?.webContents.send('download-progress', prog))
  return { path: p, version: latest.tag }
}

// -------- Java detect / auto-install helpers --------
function whichJavaCmd() {
  return process.platform === 'win32' ? 'java.exe' : 'java'
}
async function checkJava() {
  return await new Promise(resolve => {
    const java = spawn(whichJavaCmd(), ['-version'])
    let ok = false
    java.on('error', () => resolve({ ok: false }))
    java.stderr.on('data', d => { if (d.toString().includes('version')) ok = true })
    java.on('close', () => resolve({ ok }))
  })
}
function adoptiumBinaryInfo() {
  const arch = process.arch
  const platform = process.platform
  const base = 'https://api.adoptium.net/v3/binary/latest/17/ga'
  if (platform === 'win32')
    return { url: `${base}/windows/${arch}/jdk/hotspot/normal/eclipse?project=jdk`, ext: '.zip' }
  if (platform === 'darwin')
    return { url: `${base}/mac/${arch}/jdk/hotspot/normal/eclipse?project=jdk`, ext: '.tar.gz' }
  return { url: `${base}/linux/${arch}/jdk/hotspot/normal/eclipse?project=jdk`, ext: '.tar.gz' }
}
async function downloadJava(onProgress) {
  const info = adoptiumBinaryInfo()
  const tmp = join(getUserDir(), `temurin17${info.ext}`)
  await download(info.url, tmp, onProgress)
  const jreDir = join(getUserDir(), 'jre17')
  await fs.rm(jreDir, { recursive: true, force: true })
  await fs.mkdir(jreDir, { recursive: true })
  if (info.ext === '.zip') {
    await new Promise((resolve, reject) => {
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path "${tmp}" -DestinationPath "${jreDir}" -Force`
      ])
      ps.on('exit', c => (c === 0 ? resolve() : reject(new Error('Expand-Archive failed'))))
      ps.on('error', reject)
    })
  } else {
    await new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', tmp, '-C', jreDir])
      tar.on('exit', c => (c === 0 ? resolve() : reject(new Error('tar extract failed'))))
      tar.on('error', reject)
    })
  }
  const candidates = [
    'bin/java',
    'bin/java.exe',
    'jdk-17/bin/java',
    'jdk-17/bin/java.exe'
  ]
  for (const rel of candidates) {
    const full = join(jreDir, rel)
    if (existsSync(full)) return { javaPath: full }
  }
  return { javaPath: null }
}
// ----------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    backgroundColor: '#0d0b10',
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  if (NUXT_DEV) mainWindow.loadURL(NUXT_URL)
  else mainWindow.loadFile(join(process.cwd(), 'dist', 'renderer', 'index.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
}

// App lifecycle
electronApp.whenReady().then(() => {
  createWindow()
  electronApp.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
ipcMain.handle('set-always-on-top', async (evt, val) => { if (mainWindow) mainWindow.setAlwaysOnTop(!!val); return { ok: true } })

ipcMain.handle('is-running', async () => ({ running: !!bbmpProc }))

electronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') electronApp.quit()
})

// IPC: latest release
ipcMain.handle('download-latest', async () => {
  try { return await ensureJar() } catch (e) { return { error: String(e) } }
})

// IPC: download from custom JAR URL
ipcMain.handle('download-jar-url', async (evt, url) => {
  try {
    const filename = url.split('/').pop() || 'bbmp.jar'
    const dest = join(getUserDir(), filename)
    await download(url, dest, p => mainWindow?.webContents.send('download-progress', p))
    const versionGuess = (filename.match(/v[\d._-]+/i) || [])[0] || 'custom'
    return { path: dest, version: versionGuess, name: filename }
  } catch (e) {
    return { error: String(e) }
  }
})

// IPC: Java helpers
ipcMain.handle('check-java', async () => await checkJava())
ipcMain.handle('install-java', async () => {
  try {
    const res = await downloadJava(p => mainWindow?.webContents.send('java-progress', p))
    return { ok: !!res.javaPath, javaPath: res.javaPath }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

// IPC: file picker
ipcMain.handle('pick-java', async () => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] })
  if (res.canceled || !res.filePaths[0]) return null
  return res.filePaths[0]
})

// IPC: launch / stop
ipcMain.handle('launch-bbmp', async (evt, args) => {
  try {
    if (bbmpProc) return { error: 'Already running' }
    // Prefer latest jar (auto download)
    const ensure = await ensureJar()

    // Choose Java, auto-install if missing
    let java = args.javaPath || whichJavaCmd()
    const check = await checkJava()
    if (!check.ok && !args.javaPath) {
      const res = await downloadJava(p => mainWindow?.webContents.send('java-progress', p))
      if (res.javaPath) java = res.javaPath
    }

    const launchArgs = [
      '-jar', ensure.path,
      '-port', String(args.port || 25565),
      '-ip', args.server || 'play.hypixel.net',
      '-rport', String(args.rport || 25565)
    ]
    if (args.devmode) launchArgs.push('-devmode', 'true')

    bbmpProc = spawn(java, launchArgs, { cwd: getUserDir() })
    bbmpProc.stdout.on('data', d => mainWindow?.webContents.send('bbmp-log', d.toString()))
    bbmpProc.stderr.on('data', d => mainWindow?.webContents.send('bbmp-log', d.toString()))
    bbmpProc.on('close', code => { mainWindow?.webContents.send('bbmp-exit', code); bbmpProc = null })
    return { ok: true, version: ensure.version, cmd: [java, ...launchArgs].join(' ') }
  } catch (e) {
    return { error: String(e) }
  }
})

ipcMain.handle('stop-bbmp', async () => {
  if (!bbmpProc) return { ok: true }
  bbmpProc.kill('SIGTERM')
  return { ok: true }
})
