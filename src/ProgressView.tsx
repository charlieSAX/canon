import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Lang } from './types'
import { db, exportState, getMetaNum, importState } from './db'
import { computeStreak } from './streak'
import { buildCollections, type CollectionSet } from './collections'
import { loadAllPaintings, loadMovements } from './content'
import { quizUnlockThreshold } from './quiz'
import { todayStr } from './dates'
import { str, testLockedLine } from './i18n'

interface Props {
  today: string
  lang: Lang
  onBack: () => void
  onStartQuiz: () => void
}

export default function ProgressView({ today, lang, onBack, onStartQuiz }: Props) {
  const points = useLiveQuery(() => getMetaNum('points'), [], 0)
  const tokens = useLiveQuery(() => getMetaNum('freezeTokens'), [], 0)
  const streak = useLiveQuery(() => computeStreak(today), [today], 0)
  const seenRows = useLiveQuery(() => db.seen.toArray(), [])
  const [collections, setCollections] = useState<CollectionSet[]>([])
  const [threshold, setThreshold] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const S = str(lang)

  const seenCount = seenRows?.length ?? 0

  useEffect(() => {
    quizUnlockThreshold().then(setThreshold)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([loadAllPaintings(), loadMovements()]).then(([all, movements]) => {
      if (!alive) return
      const seenIds = new Set((seenRows ?? []).map((r) => r.paintingId))
      setCollections(buildCollections([...all.values()], seenIds, movements, lang))
    })
    return () => {
      alive = false
    }
  }, [seenRows, lang])

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
    if (!window.confirm(S.importConfirm)) return
    try {
      await importState(await file.text())
      setNotice(S.importDone)
    } catch {
      setNotice(S.importFailed)
    }
  }

  const unlocked = threshold !== null && seenCount >= threshold
  const grouped: Array<[string, CollectionSet[]]> = [
    [S.artists, collections.filter((c) => c.kind === 'artist')],
    [S.movements, collections.filter((c) => c.kind === 'movement')],
    [S.centuries, collections.filter((c) => c.kind === 'century')]
  ]

  return (
    <div className="progress">
      <button className="text-btn back" onClick={onBack}>
        {S.theGallery}
      </button>

      <div className="stats">
        <div className="stat">
          <span className="stat-value" data-testid="streak">
            {streak}
          </span>
          <span className="stat-label">{S.dayStreak}</span>
        </div>
        <div className="stat">
          <span className="stat-value" data-testid="points">
            {points}
          </span>
          <span className="stat-label">{S.points}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{tokens}</span>
          <span className="stat-label">{S.freezesHeld}</span>
        </div>
      </div>

      {unlocked ? (
        <button className="text-btn test-btn" onClick={onStartQuiz}>
          {S.theTest}
        </button>
      ) : (
        <p className="test-locked">{testLockedLine(lang, threshold ?? 0, seenCount)}</p>
      )}

      <div className="collections">
        {grouped.map(([label, sets]) =>
          sets.length === 0 ? null : (
            <section key={label}>
              <h4 className="label">{label}</h4>
              {sets.map((s) => (
                <p key={`${s.kind}|${s.key}`} className={s.seen === s.total ? 'coll done' : 'coll'}>
                  <span>{s.label}</span>
                  <span className="coll-count">
                    {s.seen} {S.ofc} {s.total}
                  </span>
                </p>
              ))}
            </section>
          )
        )}
      </div>

      <div className="portability">
        <button className="text-btn" onClick={() => void doExport()}>
          {S.exportProgress}
        </button>
        <button className="text-btn" onClick={() => fileInput.current?.click()}>
          {S.importProgress}
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
