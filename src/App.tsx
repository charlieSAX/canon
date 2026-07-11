import { useCallback, useEffect, useState } from 'react'
import type { Lang } from './types'
import { initTestHooks, todayStr } from './dates'
import { reconcile } from './streak'
import { db, setMeta } from './db'
import DailyView from './DailyView'
import QuizView from './QuizView'
import ProgressView from './ProgressView'

type View = 'daily' | 'quiz' | 'progress'

export default function App() {
  const [view, setView] = useState<View>('daily')
  const [today, setToday] = useState(todayStr())
  const [lang, setLang] = useState<Lang>('en')
  const [ready, setReady] = useState(false)
  const [toasts, setToasts] = useState<string[]>([])

  useEffect(() => {
    initTestHooks(() => setToday(todayStr()))
    const onVisible = () => {
      if (document.visibilityState === 'visible') setToday(todayStr())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([reconcile(today), db.meta.get('lang')]).then(([, langRow]) => {
      if (!alive) return
      if (langRow?.value === 'es') setLang('es')
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [today])

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'en' ? 'es' : 'en'
      void setMeta('lang', next)
      return next
    })
  }, [])

  const pushToasts = useCallback((lines: string[]) => {
    if (lines.length > 0) setToasts((t) => [...t, ...lines])
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => setToasts((t) => t.slice(1)), 2600)
    return () => clearTimeout(timer)
  }, [toasts])

  if (!ready) return <div className="void" />

  return (
    <>
      {view === 'daily' && (
        <DailyView
          today={today}
          lang={lang}
          onToggleLang={toggleLang}
          onToasts={pushToasts}
          onOpenProgress={() => setView('progress')}
        />
      )}
      {view === 'quiz' && <QuizView today={today} lang={lang} onExit={() => setView('progress')} />}
      {view === 'progress' && (
        <ProgressView
          today={today}
          lang={lang}
          onBack={() => setView('daily')}
          onStartQuiz={() => setView('quiz')}
        />
      )}
      {toasts.length > 0 && (
        <div className="toast" key={`${toasts[0]}-${toasts.length}`}>
          {toasts[0]}
        </div>
      )}
    </>
  )
}
