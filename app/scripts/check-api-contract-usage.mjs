import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(__dirname, '../src')

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const ignoredDirectories = new Set(['generated'])

const forbiddenPatterns = [
  {
    label: 'requestApi raw /api path',
    regex: /requestApi(?:<[\s\S]*?>)?\(\s*['"`]\/api\//g,
  },
  {
    label: 'fetchJson raw /api path',
    regex: /fetchJson(?:<[\s\S]*?>)?\(\s*['"`]\/api\//g,
  },
  {
    label: 'fetch raw /api path',
    regex: /fetch\(\s*['"`]\/api\//g,
  },
  {
    label: 'fetch raw /quote path',
    regex: /fetch\(\s*['"`]\/quote(?:['"`])/g,
  },
  {
    label: 'toPublicApiUrl raw /api path',
    regex: /toPublicApiUrl\(\s*['"`]\/api\//g,
  },
  {
    label: 'resolveUrl raw /api path',
    regex: /resolveUrl\(\s*['"`]\/api\//g,
  },
]

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue
      files.push(...await collectFiles(fullPath))
      continue
    }

    if (!sourceExtensions.has(path.extname(entry.name))) continue
    files.push(fullPath)
  }

  return files
}

const lineNumberForIndex = (content, index) => content.slice(0, index).split('\n').length

const main = async () => {
  const files = await collectFiles(srcRoot)
  const violations = []

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    for (const pattern of forbiddenPatterns) {
      pattern.regex.lastIndex = 0
      let match = pattern.regex.exec(content)
      while (match) {
        violations.push({
          file,
          line: lineNumberForIndex(content, match.index),
          label: pattern.label,
        })
        match = pattern.regex.exec(content)
      }
    }
  }

  if (violations.length === 0) {
    console.log('[api-contract-check] OK')
    return
  }

  console.error('[api-contract-check] Se detectaron llamadas HTTP con rutas literales. Usa @/lib/api/endpoints o sus helpers.')
  for (const violation of violations) {
    const relativePath = path.relative(path.resolve(__dirname, '..'), violation.file)
    console.error(`- ${relativePath}:${violation.line} ${violation.label}`)
  }
  process.exit(1)
}

main().catch((error) => {
  console.error('[api-contract-check] Error inesperado:', error)
  process.exit(1)
})
