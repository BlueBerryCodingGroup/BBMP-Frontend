const { contextBridge, ipcRenderer } = require('electron')

const api = {
  downloadLatest: () => ipcRenderer.invoke('download-latest'),
  checkJava: () => ipcRenderer.invoke('check-java'),
  installJava: () => ipcRenderer.invoke('install-java'),
  launch: (args) => ipcRenderer.invoke('launch-bbmp', args),
  stop: () => ipcRenderer.invoke('stop-bbmp'),
  onDownload: (cb) => ipcRenderer.on('download-progress', (_, p) => cb(p)),
  onJavaProgress: (cb) => ipcRenderer.on('java-progress', (_, p) => cb(p)),
  onLog: (cb) => ipcRenderer.on('bbmp-log', (_, s) => cb(s)),
  onExit: (cb) => ipcRenderer.on('bbmp-exit', (_, code) => cb(code)),
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', !!val),
  isRunning: () => ipcRenderer.invoke('is-running')
}

contextBridge.exposeInMainWorld('bbmp', api)
