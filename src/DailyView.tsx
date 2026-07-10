import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Painting } from './types'
import { db } from './db'
import { paintingsFor, imageUrl } from './content'
import { recordView } from './viewing'

interface Props {
  today: string
  onToasts: (lines: string[]) => void
  onOpenProgress: () => void
}

function ProgressButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="corner-btn" aria-label="Progress" onClick={onOpen}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3.5" y="3.5" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="7" y="7" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </button>
  )
}

export default function DailyView({ today, onToasts, onOpenProgress }: Props) {
  const [paintings, setPaintings] = useState<Painting[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setPaintings(null)
    setOpenId(null)
    paintingsFor(today).then((p) => {
      if (alive) setPaintings(p)
    })
    return () => {
      alive = false
    }
  }, [today])

  const viewedRows = useLiveQuery(() => db.dayViews.where('date').equals(today).toArray(), [today])
  const viewed = new Set((viewedRows ?? []).map((r) => r.paintingId))

  if (!paintings) return <div className="void" />

  if (paintings.length === 0) {
    return (
      <div className="closed" data-date={today}>
        <ProgressButton onOpen={onOpenProgress} />
        <p className="closed-title">The gallery is closed.</p>
        <p className="closed-sub">Nothing is hung today.</p>
      </div>
    )
  }

  const scheduledIds = paintings.map((p) => p.id)

  async function tap(p: Painting) {
    if (openId === p.id) {
      setOpenId(null)
      return
    }
    setOpenId(p.id)
    const result = await recordView(p, today, scheduledIds)
    const lines = [...result.milestones]
    if (result.completedDay) lines.push('Day complete.')
    onToasts(lines)
  }

  return (
    <div className="daily" data-date={today}>
      <div className="dots" aria-hidden="true">
        {paintings.map((p) => (
          <span key={p.id} className={viewed.has(p.id) ? 'dot on' : 'dot'} />
        ))}
      </div>
      <ProgressButton onOpen={onOpenProgress} />
      <div className="scroller">
        {paintings.map((p) => (
          <section className="slide" key={p.id} onClick={() => void tap(p)}>
            <img
              className="art"
              src={imageUrl(p)}
              alt={`${p.title}, ${p.artist}`}
              width={p.image.width}
              height={p.image.height}
              loading="lazy"
            />
            <div className={openId === p.id ? 'meta faded' : 'meta'}>
              <h2 className="title">{p.title}</h2>
              <p className="sub">
                {p.artist}, {p.year}
              </p>
            </div>
            <div
              className={openId === p.id ? 'card open' : 'card'}
              onClick={(e) => e.stopPropagation()}
            >
              {p.draft && <span className="draft-dot" title="Draft" />}
              <h3 className="card-title">{p.title}</h3>
              <p className="card-sub">
                {p.medium}, {p.dimensions}. {p.location.museum}, {p.location.city}.
              </p>
              <h4 className="label">The Scene</h4>
              <p className="essay">{p.text.scene}</p>
              <h4 className="label">The Craft</h4>
              <p className="essay">{p.text.craft}</p>
              <h4 className="label">The Painter</h4>
              <p className="essay">{p.text.painter}</p>
              <p className="fact">{p.fact}</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
