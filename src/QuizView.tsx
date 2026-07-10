import { useEffect, useRef, useState } from 'react'
import type { Painting } from './types'
import { imageUrl } from './content'
import { buildSession, type Question } from './quiz'
import { gradeFor, reviewCard } from './fsrsAdapter'
import { awardPoints } from './points'

interface Props {
  today: string
  onExit: () => void
}

export default function QuizView({ today, onExit }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'answer' | 'feedback' | 'done'>('answer')
  const [lastCorrect, setLastCorrect] = useState(false)
  const [gainedTotal, setGainedTotal] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const startedAt = useRef(0)

  useEffect(() => {
    buildSession(new Date()).then(setQuestions)
  }, [])

  useEffect(() => {
    startedAt.current = performance.now()
    setPicks([])
  }, [index, questions])

  if (!questions) return <div className="void" />
  if (questions.length === 0) {
    return (
      <div className="quiz">
        <p className="closed-title">Nothing to test yet.</p>
        <button className="text-btn" onClick={onExit}>
          Return
        </button>
      </div>
    )
  }

  const q = questions[index]

  async function settle(correct: boolean) {
    const seconds = (performance.now() - startedAt.current) / 1000
    const grade = gradeFor(correct, seconds)
    const interval = await reviewCard(q.target.id, grade, new Date())
    if (correct) {
      const gained = await awardPoints(5 + Math.min(15, interval), today)
      setGainedTotal((g) => g + gained)
      setCorrectCount((c) => c + 1)
    }
    setLastCorrect(correct)
    setPhase('feedback')
    setTimeout(() => {
      if (index + 1 >= questions!.length) {
        setPhase('done')
      } else {
        setIndex((i) => i + 1)
        setPhase('answer')
      }
    }, 1100)
  }

  function pickChoice(p: Painting) {
    if (phase !== 'answer') return
    void settle(p.id === q.target.id)
  }

  function pickChrono(p: Painting) {
    if (phase !== 'answer' || picks.includes(p.id)) return
    const next = [...picks, p.id]
    setPicks(next)
    if (next.length === q.options.length) {
      const truth = [...q.options].sort((a, b) => a.year - b.year).map((x) => x.id)
      void settle(truth.every((id, i) => next[i] === id))
    }
  }

  if (phase === 'done') {
    return (
      <div className="quiz done">
        <p className="quiz-kicker">The Test</p>
        <p className="quiz-result">
          {correctCount} of {questions.length}
        </p>
        <p className="quiz-sub">{gainedTotal} points</p>
        <button className="text-btn" onClick={onExit}>
          Return to the gallery
        </button>
      </div>
    )
  }

  return (
    <div className="quiz">
      <p className="quiz-kicker">
        {index + 1} of {questions.length}
      </p>

      {q.type === 'title-to-painting' && (
        <>
          <p className="quiz-prompt">{q.target.title}</p>
          <div className="quiz-grid">
            {q.options.map((p) => (
              <button key={p.id} className="quiz-art" onClick={() => pickChoice(p)}>
                <img src={imageUrl(p)} alt="A painting" />
              </button>
            ))}
          </div>
        </>
      )}

      {q.type === 'fact-to-painting' && (
        <>
          <p className="quiz-prompt small">{q.target.fact}</p>
          <div className="quiz-grid">
            {q.options.map((p) => (
              <button key={p.id} className="quiz-art" onClick={() => pickChoice(p)}>
                <img src={imageUrl(p)} alt="A painting" />
              </button>
            ))}
          </div>
        </>
      )}

      {q.type === 'painting-to-artist' && (
        <>
          <div className="quiz-single">
            <img src={imageUrl(q.target)} alt="A painting" />
          </div>
          <div className="quiz-texts">
            {q.options.map((p) => (
              <button key={p.id} className="text-btn option" onClick={() => pickChoice(p)}>
                {p.artist}
              </button>
            ))}
          </div>
        </>
      )}

      {q.type === 'chronology' && (
        <>
          <p className="quiz-prompt small">Earliest first</p>
          <div className="quiz-grid three">
            {q.options.map((p) => (
              <button key={p.id} className="quiz-art" onClick={() => pickChrono(p)}>
                <img src={imageUrl(p)} alt="A painting" />
                {picks.includes(p.id) && <span className="pick-order">{picks.indexOf(p.id) + 1}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'feedback' && (
        <div className="verdict">
          <p className="verdict-word">{lastCorrect ? 'Correct.' : 'No.'}</p>
          {!lastCorrect && (
            <p className="verdict-truth">
              {q.type === 'chronology'
                ? [...q.options].sort((a, b) => a.year - b.year).map((p) => `${p.title}, ${p.year}`).join('; ')
                : `${q.target.title}. ${q.target.artist}, ${q.target.year}.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
