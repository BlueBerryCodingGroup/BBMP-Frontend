<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { loadSettings, saveSettings, type BBMPSettings } from '~/composables/usePersistedSettings'

type LaunchArgs = { server: string, port: number, rport: number, devmode: boolean, javaPath?: string }

const hasApi = () => typeof window !== 'undefined' && (window as any).bbmp
const api = () => (hasApi() ? (window as any).bbmp : null)

const server = ref('play.hypixel.net')
const port = ref(25565)
const rport = ref(25565)
const devmode = ref(true)
const javaPath = ref('')
const customUrl = ref('')
const alwaysOnTop = ref(false)

const theme = ref<'purple'|'blue'|'neon'|'contrast'>('purple')
const font = ref<'system'|'inter'|'jetbrains'>('system')

const javaOk = ref<boolean | null>(null)
const javaProgress = ref(0)
const status = ref<'idle'|'downloading'|'ready'|'running'|'error'|'no-electron'>('idle')
const version = ref<string>(''); const progress = ref(0)
const log = ref('')

const isRunning = computed(() => status.value === 'running')

function applyTheme() {
  const root = document.documentElement
  root.setAttribute('data-theme', theme.value === 'purple' ? '' : theme.value)
  const sans =
    font.value === 'inter'
      ? 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial'
      : font.value === 'jetbrains'
      ? '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
      : 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial'
  const mono =
    font.value === 'jetbrains'
      ? '"JetBrains Mono", ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
      : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
  root.style.setProperty('--font-sans', sans)
  root.style.setProperty('--font-mono', mono)
}

function saveAll() {
  saveSettings({
    theme: theme.value, font: font.value, devmode: devmode.value, server: server.value,
    port: port.value, rport: rport.value, customUrl: customUrl.value, javaPath: javaPath.value, alwaysOnTop: alwaysOnTop.value
  })
}

function loadAll() {
  const s = loadSettings() as Partial<BBMPSettings>
  if (s.theme) theme.value = s.theme
  if (s.font) font.value = s.font
  if (typeof s.devmode === 'boolean') devmode.value = s.devmode
  if (s.server) server.value = s.server
  if (typeof s.port === 'number') port.value = s.port
  if (typeof s.rport === 'number') rport.value = s.rport
  if (typeof s.javaPath === 'string') javaPath.value = s.javaPath
  if (typeof s.customUrl === 'string') customUrl.value = s.customUrl
  if (typeof s.alwaysOnTop === 'boolean') alwaysOnTop.value = s.alwaysOnTop
}

watch([theme, font, devmode, server, port, rport, javaPath, customUrl, alwaysOnTop], saveAll)
watch([theme, font], applyTheme)

const safeOn = () => {
  if (!api()) { status.value = 'no-electron'; return }
  api().onDownload((p:number)=>{ progress.value = Math.round(p*100) })
  api().onJavaProgress((p:number)=>{ javaProgress.value = Math.round(p*100) })
  api().onLog((s:string)=>{ if (devmode.value) log.value += s })
  api().onExit((code:number)=>{ if (devmode.value) log.value += `\n[exited ${code}]`; status.value = 'ready' })
}

const downloadLatest = async () => {
  if (!api()) return
  status.value = 'downloading'; progress.value = 0
  const res = await api().downloadLatest()
  if (res?.error) { status.value='error'; if (devmode.value) log.value += `\nERR: ${res.error}`; return }
  version.value = res.version || 'latest'; status.value = 'ready'
}
const downloadFromUrl = async () => {
  if (!api() || !customUrl.value.trim()) return
  status.value = 'downloading'; progress.value = 0
  const res = await api().downloadFromUrl(customUrl.value.trim())
  if (res?.error) { status.value='error'; if (devmode.value) log.value += `\nERR: ${res.error}`; return }
  version.value = res.version || 'custom'; status.value = 'ready'
  if (devmode.value) log.value += `\nDownloaded: ${res.name || 'jar'}`
}

const detectJava = async () => { if (api()) javaOk.value = !!(await api().checkJava())?.ok }
const installJava = async () => {
  if (!api()) return
  javaProgress.value = 0
  const res = await api().installJava()
  if (res?.ok && res.javaPath) javaPath.value = res.javaPath
  await detectJava()
}
const pickJava = async () => { if (api()) { const p = await api().pickJava(); if (p) javaPath.value = p } }

const launch = async () => {
  if (!api()) return
  const args: LaunchArgs = { server: server.value, port: port.value, rport: rport.value, devmode: devmode.value, javaPath: javaPath.value || undefined }
  const res = await api().launch(args)
  if (res?.error) { status.value='error'; if (devmode.value) log.value += `\nERR: ${res.error}`; return }
  status.value = 'running'; if (devmode.value) log.value += `\nLaunched: ${res.cmd}`
}
const stop = async () => { if (api()) { await api().stop(); status.value = 'ready' } }

async function applyAlwaysOnTop() {
  if (api()) await api().setAlwaysOnTop(alwaysOnTop.value)
}

function copyLaunchCommand() {
  const cmd = `java -jar bbmp.jar -port ${port.value} -ip ${server.value} -rport ${rport.value}${devmode.value ? ' -devmode true' : ''}`
  navigator.clipboard?.writeText(cmd)
}

onMounted(async () => {
  loadAll(); applyTheme()
  if (!api()) { status.value = 'no-electron'; return }
  safeOn(); await detectJava(); await downloadLatest()
  await applyAlwaysOnTop()
  const run = await api().isRunning?.(); if (run && run.running) status.value = 'running'
})
</script>

<template>
  <div class="container">
    <div class="card">
      <h1>
        BlueBerry Minecraft Proxy <span class="badge">BBMP</span>
        <span v-if="isRunning" class="badge" style="margin-left:8px;background:#1b2a1f;border-color:#2b4a37;color:#b6f3c3;">Running</span>
      </h1>

      <div class="row" style="margin-bottom:12px">
        <div>
          <div class="label">Theme</div>
          <select class="input" v-model="theme">
            <option value="purple">Purple</option>
            <option value="blue">Blue</option>
            <option value="neon">Neon</option>
            <option value="contrast">High Contrast</option>
          </select>
        </div>
        <div>
          <div class="label">Font</div>
          <select class="input" v-model="font">
            <option value="system">System Sans + Mono</option>
            <option value="inter">Inter (fallback)</option>
            <option value="jetbrains">JetBrains Mono (UI + Mono)</option>
          </select>
        </div>
        <div>
          <div class="label">Window</div>
          <label class="row" style="gap:8px;">
            <input type="checkbox" v-model="alwaysOnTop" @change="applyAlwaysOnTop" />
            <span>Always on top</span>
          </label>
        </div>
      </div>

      <div v-if="status==='no-electron'" class="mono" style="margin:12px 0; color:#fca5a5">
        This UI is running in a browser. Launch via Electron (`npm run dev`) to enable the native features.
      </div>

      <div class="grid">
        <div>
          <div class="label">Server address</div>
          <input class="input" v-model="server" placeholder="play.example.net"/>
        </div>
        <div>
          <div class="label">Listen port</div>
          <input class="input" type="number" v-model.number="port" />
        </div>
        <div>
          <div class="label">Remote port</div>
          <input class="input" type="number" v-model.number="rport" />
        </div>
        <div class="row" style="justify-content:space-between; margin-top:24px;">
          <label class="row" style="gap:8px;">
            <input type="checkbox" v-model="devmode" />
            <span>Dev mode UI</span>
          </label>
          <div class="row">
            <button class="btn secondary" @click="copyLaunchCommand()">Copy launch command</button>
            <button class="btn secondary" @click="pickJava()" :disabled="!api()">Pick Java</button>
          </div>
        </div>

        <div style="grid-column:1 / -1">
          <div class="label">Java</div>
          <div class="row" style="gap:12px; align-items:center">
            <span class="badge" v-if="javaOk===true">Java detected</span>
            <span class="badge" v-else-if="javaOk===false" style="background:#2a1a1a; color:#ffcccc; border-color:#4a2a2a">Java missing</span>
            <button class="btn" @click="installJava()" :disabled="!api()">Install Java 17</button>
            <div class="progress" style="width:180px" v-if="javaProgress>0 && javaProgress<100"><i :style="{ width: javaProgress+'%' }"></i></div>
          </div>
          <div class="label" style="margin-top:8px">Java path (optional override)</div>
          <input class="input" v-model="javaPath" placeholder="java"/>
        </div>

        <div style="grid-column:1 / -1">
          <div class="label">Download & version</div>
          <div class="row" style="gap:12px; align-items:center">
            <button class="btn" @click="downloadLatest()" :disabled="status==='downloading' || !api()">Download latest</button>
            <span class="badge" v-if="version">Latest: {{ version }}</span>
          </div>
          <div class="progress" style="margin-top:10px" v-if="status==='downloading'">
            <i :style="{ width: progress+'%' }"></i>
          </div>

          <div class="label" style="margin-top:16px">Custom JAR URL</div>
          <div class="row" style="gap:12px; align-items:center">
            <input class="input" v-model="customUrl" placeholder="https://github.com/.../your.jar" style="flex:1" />
            <button class="btn secondary" @click="downloadFromUrl()" :disabled="status==='downloading' || !api()">Download from URL</button>
          </div>
        </div>

        <div class="row" style="gap:12px; grid-column:1 / -1; margin-top:6px">
          <button class="btn" @click="launch()" :disabled="status==='downloading' || isRunning || !api()">Launch BBMP</button>
          <button v-if="isRunning" class="btn danger" @click="stop()">Stop</button>
        </div>

        <div v-if="devmode" style="grid-column:1 / -1">
          <div class="label">Logs (Dev Mode)</div>
          <div class="log mono">{{ log }}</div>
        </div>
      </div>

      <div class="footer">Settings are saved locally and auto-restored. Jar is downloaded to your app data folder and reused across launches.</div>
    </div>
  </div>
</template>