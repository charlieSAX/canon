import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportState, getMetaNum, importState } from './db'
import { computeStreak } from './streak'
import { buildCollections, type CollectionSet } from './collections'
import { loadAllPaintings } from './content'
import { quizUnlockThreshold } from './quiz'
import { todayStr } from './dates'

interface Props {
  today: string
  onBack: () => void
  onStartQuiz: () => void
}

export default function ProgressView({ today, onBack, onStartQuiz }: Props) {
  const points = useLiveQuery(() => getMetaNum('points'), [], 0)
  const tokens = useLiveQuery(() => getMetaNum('freezeTokens'), [], 0)
  const streak = useLiveQuery(() => computeStreak(today), [today], 0)
  const seenRows = useLiveQuery(() => db.seen.toArray(), [])
  const [collections, setCollections] = useState<CollectionSet[]>([])
  const [threshold, setThreshold] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const seenCount = seenRows?.length ?? 0

  useEffect(() => {
    quizUnlockThreshold().then(setThreshold)
  }, [])

  useEffect(() => {
    let alive = true
    loadAllPaintings().then((all) => {
      if (!alive) return
      const seenIds = new Set((seenRows ?? []).map((r) => r.paintingId))
      setCollections(buildCollections([...all.values()], seenIds))
    })
    return () => {
      alive = false
    }
  }, [seenRows])

  async function doExport() {
    const json = await exportState()
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `canon-export-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function doImport(file: File) {
    if (!window.confirm('Importing replaces all progress on this device. Continue?')) return
    try {
      await importState(await file.text())
      setNotice('Import complete.')
    } catch {
      setNotice('That file could not be read.')
    }
  }

  const unlocked = threshold !== null && seenCount >= threshold
  const grouped: Array<[string, CollectionSet[]]> = [
    ['Artists', collections.filter((c) => c.kind === 'artist')],
    ['Movements', collections.filter((c) => c.kind === 'movement')],
    ['Centuries', collections.filter((c) => c.kind === 'century')]
  ]

  return (
    <div className="progress">
      <button className="text-btn back" onClick={onBack}>
        The gallery
      </button>

      <div className="stats">
        <div className="stat">
          <span className="stat-value" data-testid="streak">
            {streak}
          </span>
          <span className="stat-label">day streak</span>
        </div>
        <div className="stat">
          <span className="stat-value" data-testid="points">
            {points}
          </span>
          <span className="stat-label">points</span>
        </div>
        <div className="stat">
          <span className="stat-value">{tokens}</span>
          <span className="stat-label">freezes held</span>
        </div>
      </div>

      {unlocked ? (
        <button className="text-btn test-btn" onClick={onStartQuiz}>
          The Test
        </button>
      ) : (
        <p className="test-locked">
          The Test opens at {threshold ?? ''} paintings seen. {seenCount} so far.
        </p>
      )}

      <div className="collections">
        {grouped.map(([label, sets]) =>
          sets.length === 0 ? null : (
            <section key={label}>
              <h4 className="label">{label}</h4>
              {sets.map((s) => (
                <p key={`${s.kind}|${s.name}`} className={s.seen === s.total ? 'coll done' : 'coll'}>
                  <span>{s.name}</span>
                  <span className="coll-count">
                    {s.seen} of {s.total}
                  </span>
                </p>
              ))}
            </section>
          )
        )}
      </div>

      <div className="portability">
        <button className="text-btn" onClick={() => void doExport()}>
          Export progress
        </button>
        <button className="text-btn" onClick={() => fileInput.current?.click()}>
          Import progress
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
        {notice && <p className="notice">{notice}</p>}
      </div>
    </div>
  )
}
