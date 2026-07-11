import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Lang, Movements, Painting } from './types'
import { db } from './db'
import { paintingsFor, loadMovements, imageUrl } from './content'
import { recordView } from './viewing'
import { str } from './i18n'

interface Props {
  today: string
  lang: Lang
  onToggleLang: () => void
  onToasts: (lines: string[]) => void
  onOpenProgress: () => void
}

function TopControls({ lang, onToggleLang, onOpen }: { lang: Lang; onToggleLang: () => void; onOpen: () => void }) {
  const S = str(lang)
  return (
    <div className="top-controls">
      <button className="lang-btn" aria-label={S.language} onClick={onToggleLang}>
        <span className={lang === 'en' ? 'on' : ''}>EN</span>
        <span className="lang-sep"> </span>
        <span className={lang === 'es' ? 'on' : ''}>ES</span>
      </button>
      <button className="corner-btn" aria-label={S.progress} onClick={onOpen}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3.5" y="3.5" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="7" y="7" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  )
}

export default function DailyView({ today, lang, onToggleLang, onToasts, onOpenProgress }: Props) {
  const [paintings, setPaintings] = useState<Painting[] | null>(null)
  const [movements, setMovements] = useState<Movements>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const S = str(lang)

  useEffect(() => {
    loadMovements().then(setMovements)
  }, [])

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
        <TopControls lang={lang} onToggleLang={onToggleLang} onOpen={onOpenProgress} />
        <p className="closed-title">{S.galleryClosed}</p>
        <p className="closed-sub">{S.nothingHung}</p>
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
    const result = await recordView(p, today, scheduledIds, lang)
    const lines = [...result.milestones]
    if (result.completedDay) lines.push(S.dayComplete)
    onToasts(lines)
  }

  return (
    <div className="daily" data-date={today}>
      <div className="dots" aria-hidden="true">
        {paintings.map((p) => (
          <span key={p.id} className={viewed.has(p.id) ? 'dot on' : 'dot'} />
        ))}
      </div>
      <TopControls lang={lang} onToggleLang={onToggleLang} onOpen={onOpenProgress} />
      <div className="scroller">
        {paintings.map((p) => {
          const text = p.text[lang]
          const movement = movements[p.movement]
          return (
            <section className="slide" key={p.id} onClick={() => void tap(p)}>
              <img
                className="art"
                src={imageUrl(p)}
                alt={`${p.title[lang]}, ${p.artist}`}
                width={p.image.width}
                height={p.image.height}
                loading="lazy"
              />
              <div className={openId === p.id ? 'meta faded' : 'meta'}>
                <h2 className="title">{p.title[lang]}</h2>
                <p className="sub">
                  {p.artist}, {p.year}
                </p>
              </div>
              <div
                className={openId === p.id ? 'card open' : 'card'}
                onClick={(e) => e.stopPropagation()}
              >
                {p.draft && <span className="draft-dot" title={S.draft} />}
                <h3 className="card-title">{p.title[lang]}</h3>
                <p className="card-sub">
                  {p.medium[lang]}, {p.dimensions}. {p.location.museum}, {p.location.city}.
                </p>
                <h4 className="label">{S.theScene}</h4>
                <p className="essay">{text.scene}</p>
                <h4 className="label">{S.theCraft}</h4>
                <p className="essay">{text.craft}</p>
                {movement && (
                  <>
                    <h4 className="label">
                      {S.theStyle}: {movement.name[lang]}
                    </h4>
                    <p className="essay style-blurb">{movement.blurb[lang]}</p>
                  </>
                )}
                <h4 className="label">{S.thePainter}</h4>
                <p className="essay">{text.painter}</p>
                <h4 className="label">{S.thePoint}</h4>
                <p className="essay">{text.point}</p>
                {p.notables.length > 0 && (
                  <>
                    <h4 className="label">{S.notables}</h4>
                    {p.notables.map((n, i) => (
                      <p className="notable" key={i}>
                        {n[lang]}
                      </p>
                    ))}
                  </>
                )}
                <p className="fact">{p.fact[lang]}</p>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
