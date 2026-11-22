import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const build = 'dist'
const output = 'review'
const html = await readFile(join(build, 'index.html'), 'utf8')
const entry = html.match(/<script\b[^>]*\bsrc="(\/assets\/[^"]+\.js)"[^>]*><\/script>/)
const styles = html.match(/<link\b[^>]*\bhref="(\/assets\/[^"]+\.css)"[^>]*>/)

if (!entry || !styles) throw new Error('Build the storefront before packaging the review HTML.')

const assets = Object.create(null)
async function addImages(directory, mime, suffix) {
  const entries = await readdir(join(build, directory), { withFileTypes: true })
  for (const item of entries) {
    const path = directory + '/' + item.name
    if (item.isDirectory()) await addImages(path, mime, suffix)
    else if (item.name.endsWith(suffix)) {
      const bytes = await readFile(join(build, path))
      assets['/' + path] = 'data:' + mime + ';base64,' + bytes.toString('base64')
    }
  }
}
await addImages('campaign', 'image/jpeg', '.jpg')
await addImages('products', 'image/webp', '-1120.webp')

const script = await readFile(join(build, entry[1]), 'utf8')
const css = await readFile(join(build, styles[1]), 'utf8')
const standalone = html
  .replace(styles[0], () => '<style>' + css + '</style>')
  .replace(entry[0], () =>
    '<script>globalThis.gznReviewAssets = ' + JSON.stringify(assets) + '</script>' +
    '<script type="module">' + script.replace(/<\/script/gi, '<\\/script') + '</script>'
  )
await mkdir(output, { recursive: true })
await writeFile(join(output, 'GZN_Shop_Vorschau.html'), standalone)
