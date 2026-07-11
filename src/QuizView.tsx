import { useEffect, useRef, useState } from 'react'
import type { Lang, Painting } from './types'
import { imageUrl } from './content'
import { buildSession, type Question } from './quiz'
import { gradeFor, reviewCard } from './fsrsAdapter'
import { awardPoints } from './points'
import { str } from './i18n'

interface Props {
  today: string
  lang: Lang
  onExit: () => void
}

export default function QuizView({ today, lang, onExit }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'answer' | 'feedback' | 'done'>('answer')
  const [lastCorrect, setLastCorrect] = useState(false)
  const [gainedTotal, setGainedTotal] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const startedAt = useRef(0)
  const S = str(lang)

  useEffect(() => {
    buildSession(new Date(), lang).then(setQuestions)
    // The session is built once for the language active at entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    startedAt.current = performance.now()
    setPicks([])
  }, [index, questions])

  if (!questions) return <div className="void" />
  if (questions.length === 0) {
    return (
      <div className="quiz">
        <p className="closed-title">{S.nothingToTest}</p>
        <button className="text-btn" onClick={onExit}>
          {S.return}
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

  function pickImage(p: Painting) {
    if (phase !== 'answer') return
    void settle(p.id === q.target.id)
  }

  function pickText(key: string) {
    if (phase !== 'answer' || q.kind !== 'text-choice') return
    void settle(key === q.correctKey)
  }

  function pickChrono(p: Painting) {
    if (phase !== 'answer' || picks.includes(p.id)) return
    const next = [...picks, p.id]
    setPicks(next)
    if (next.length === q.options.length) {
      const truth = [...(q.options as Painting[])].sort((a, b) => a.year - b.year).map((x) => x.id)
      void settle(truth.every((id, i) => next[i] === id))
    }
  }

  if (phase === 'done') {
    return (
      <div className="quiz done">
        <p className="quiz-kicker">{S.theTest}</p>
        <p className="quiz-result">
          {correctCount} {S.ofc} {questions.length}
        </p>
        <p className="quiz-sub">
          {gainedTotal} {S.points}
        </p>
        <button className="text-btn" onClick={onExit}>
          {S.returnToGallery}
        </button>
      </div>
    )
  }

  const textPrompt =
    q.kind === 'text-choice' ? (q.type === 'painting-to-artist' ? S.whoPainted : q.type === 'style' ? S.whichStyle : S.whichPoint) : ''

  return (
    <div className="quiz" data-qtype={q.type}>
      <p className="quiz-kicker">
        {index + 1} {S.ofc} {questions.length}
      </p>

      {q.kind === 'image-grid' && (
        <>
          <p className={q.type === 'title-to-painting' ? 'quiz-prompt' : 'quiz-prompt small'}>{q.prompt}</p>
          <div className="quiz-grid">
            {q.options.map((p) => (
              <button key={p.id} className="quiz-art" onClick={() => pickImage(p)}>
                <img src={imageUrl(p)} alt={S.aPainting} />
              </button>
            ))}
          </div>
        </>
      )}

      {q.kind === 'text-choice' && (
        <>
          <div className="quiz-single">
            <img src={imageUrl(q.target)} alt={S.aPainting} />
          </div>
          <p className="quiz-prompt tiny">{textPrompt}</p>
          <div className="quiz-texts">
            {q.options.map((o) => (
              <button key={o.key} className="text-btn option" onClick={() => pickText(o.key)}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}

      {q.kind === 'chronology' && (
        <>
          <p className="quiz-prompt small">{S.earliestFirst}</p>
          <div className="quiz-grid three">
            {q.options.map((p) => (
              <button key={p.id} className="quiz-art" onClick={() => pickChrono(p)}>
                <img src={imageUrl(p)} alt={S.aPainting} />
                {picks.includes(p.id) && <span className="pick-order">{picks.indexOf(p.id) + 1}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'feedback' && (
        <div className="verdict">
          <p className="verdict-word">{lastCorrect ? S.correct : S.wrong}</p>
          {!lastCorrect && (
            <p className="verdict-truth">
              {q.kind === 'chronology'
                ? [...(q.options as Painting[])]
                    .sort((a, b) => a.year - b.year)
                    .map((p) => `${p.title[lang]}, ${p.year}`)
                    .join('; ')
                : `${q.target.title[lang]}. ${q.target.artist}, ${q.target.year}.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
