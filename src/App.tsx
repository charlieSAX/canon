import { useCallback, useEffect, useState } from 'react'
import { initTestHooks, todayStr } from './dates'
import { reconcile } from './streak'
import DailyView from './DailyView'
import QuizView from './QuizView'
import ProgressView from './ProgressView'

type View = 'daily' | 'quiz' | 'progress'

export default function App() {
  const [view, setView] = useState<View>('daily')
  const [today, setToday] = useState(todayStr())
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
    reconcile(today).then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [today])

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
        <DailyView today={today} onToasts={pushToasts} onOpenProgress={() => setView('progress')} />
      )}
      {view === 'quiz' && <QuizView today={today} onExit={() => setView('progress')} />}
      {view === 'progress' && (
        <ProgressView today={today} onBack={() => setView('daily')} onStartQuiz={() => setView('quiz')} />
      )}
      {toasts.length > 0 && (
        <div className="toast" key={`${toasts[0]}-${toasts.length}`}>
          {toasts[0]}
        </div>
      )}
    </>
  )
}
