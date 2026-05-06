import { useRef, useState } from 'react'
import { useSettings } from '../store/settings'
import { useLibrary } from '../store/library'
import { CheckIcon } from '../components/Icons'
import type { WatchEntry } from '../types'

export default function Settings() {
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)
  const omdbKey = useSettings((s) => s.omdbKey)
  const setOmdbKey = useSettings((s) => s.setOmdbKey)
  const entries = useLibrary((s) => s.entries)
  const importMany = useLibrary((s) => s.importMany)
  const clearAll = useLibrary((s) => s.clearAll)

  const [keyDraft, setKeyDraft] = useState(omdbKey)
  const [savedFlash, setSavedFlash] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reel-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function importJson(file: File) {
    setImportMsg(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) throw new Error('Expected an array of entries')
      await importMany(parsed as WatchEntry[])
      setImportMsg(`Imported ${parsed.length} entries.`)
    } catch (e) {
      setImportMsg(`Import failed: ${(e as Error).message}`)
    }
  }

  function saveKey() {
    setOmdbKey(keyDraft.trim())
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  function handleClear() {
    if (!confirm('This will permanently delete all entries from your library. Continue?')) return
    clearAll()
  }

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className={`chip ${theme === 'light' ? 'chip-active' : ''}`}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`chip ${theme === 'dark' ? 'chip-active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">OMDb API key</h2>
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
          Used to search movies and series.{' '}
          <a className="text-accent hover:underline" href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer">
            Get a free key
          </a>{' '}
          (1000 requests/day). The key is stored only in your browser's localStorage.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            className="input"
            placeholder="Paste your OMDb key…"
          />
          <button type="button" className="btn-primary whitespace-nowrap" onClick={saveKey}>
            {savedFlash ? <><CheckIcon size={16} /> Saved</> : 'Save'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Backup</h2>
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
          Export your library to a JSON file, or import one. Useful for moving between devices or making a snapshot.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline" onClick={exportJson} disabled={entries.length === 0}>
            Export {entries.length} entries
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importJson(f)
              e.target.value = ''
            }}
          />
          <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
        </div>
        {importMsg && <p className="text-sm">{importMsg}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-danger">Danger zone</h2>
        <button type="button" className="btn-danger" onClick={handleClear} disabled={entries.length === 0}>
          Clear library
        </button>
      </section>

      <section className="text-xs text-ink-muted dark:text-ink-dark-muted pt-6 border-t border-line dark:border-line-dark">
        Built for WEB-LAB6 · React + TypeScript + Vite · Storage: IndexedDB (entries) + localStorage (preferences) · APIs: Jikan, OMDb.
      </section>
    </div>
  )
}
