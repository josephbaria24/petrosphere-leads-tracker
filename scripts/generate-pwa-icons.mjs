import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const src = 'public/petroslogo.png'
const out = path.join('public', 'icons')
fs.mkdirSync(out, { recursive: true })

const jobs = [
  { size: 180, file: path.join(out, 'apple-touch-icon.png') },
  { size: 192, file: path.join(out, 'icon-192.png') },
  { size: 512, file: path.join(out, 'icon-512.png') },
  { size: 32, file: path.join('public', 'favicon-32.png') },
]

for (const job of jobs) {
  await sharp(src)
    .resize(job.size, job.size, {
      fit: 'contain',
      background: { r: 0, g: 4, b: 74, alpha: 1 },
    })
    .png()
    .toFile(job.file)
  console.log('wrote', job.file)
}
