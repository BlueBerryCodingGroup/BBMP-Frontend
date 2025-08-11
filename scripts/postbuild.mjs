import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
const out = '.output/public'
const dest = 'dist/renderer'
await fs.rm(dest, { recursive: true, force: true }).catch(()=>{})
await fs.mkdir(dest, { recursive: true })
async function copyDir(src, dst){
  await fs.mkdir(dst, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const e of entries){
    const s = resolve(src, e.name)
    const d = resolve(dst, e.name)
    if (e.isDirectory()) await copyDir(s, d)
    else await fs.copyFile(s, d)
  }
}
await copyDir(out, dest)
console.log('Copied Nuxt build to dist/renderer')