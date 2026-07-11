import type { Lang } from './types'

// Every user-facing UI string, both languages. Content strings live in the
// painting and movement JSON; this file is interface only.
const STRINGS = {
  en: {
    theScene: 'The Scene',
    theCraft: 'The Craft',
    theStyle: 'The Style',
    thePainter: 'The Painter',
    thePoint: 'The Point',
    notables: 'Worth Hunting For',
    galleryClosed: 'The gallery is closed.',
    nothingHung: 'Nothing is hung today.',
    theGallery: 'The gallery',
    dayStreak: 'day streak',
    points: 'points',
    freezesHeld: 'freezes held',
    theTest: 'The Test',
    artists: 'Artists',
    movements: 'Movements',
    centuries: 'Centuries',
    exportProgress: 'Export progress',
    importProgress: 'Import progress',
    importConfirm: 'Importing replaces all progress on this device. Continue?',
    importDone: 'Import complete.',
    importFailed: 'That file could not be read.',
    ofc: 'of',
    correct: 'Correct.',
    wrong: 'No.',
    earliestFirst: 'Earliest first',
    whoPainted: 'Who painted this?',
    whichStyle: 'What is the style?',
    whichPoint: 'What is this painting about?',
    returnToGallery: 'Return to the gallery',
    return: 'Return',
    nothingToTest: 'Nothing to test yet.',
    dayComplete: 'Day complete.',
    aPainting: 'A painting',
    language: 'Language',
    progress: 'Progress',
    draft: 'Draft'
  },
  es: {
    theScene: 'La escena',
    theCraft: 'La técnica',
    theStyle: 'El estilo',
    thePainter: 'El pintor',
    thePoint: 'La esencia',
    notables: 'Detalles que buscar',
    galleryClosed: 'La galería está cerrada.',
    nothingHung: 'Hoy no hay nada colgado.',
    theGallery: 'La galería',
    dayStreak: 'días de racha',
    points: 'puntos',
    freezesHeld: 'comodines',
    theTest: 'La prueba',
    artists: 'Artistas',
    movements: 'Movimientos',
    centuries: 'Siglos',
    exportProgress: 'Exportar progreso',
    importProgress: 'Importar progreso',
    importConfirm: 'Importar reemplaza todo el progreso en este dispositivo. ¿Continuar?',
    importDone: 'Importación completada.',
    importFailed: 'No se pudo leer ese archivo.',
    ofc: 'de',
    correct: 'Correcto.',
    wrong: 'No.',
    earliestFirst: 'La más antigua primero',
    whoPainted: '¿Quién lo pintó?',
    whichStyle: '¿Cuál es el estilo?',
    whichPoint: '¿De qué trata este cuadro?',
    returnToGallery: 'Volver a la galería',
    return: 'Volver',
    nothingToTest: 'Todavía no hay nada que probar.',
    dayComplete: 'Día completado.',
    aPainting: 'Un cuadro',
    language: 'Idioma',
    progress: 'Progreso',
    draft: 'Borrador'
  }
} as const

export type UIStrings = { [K in keyof (typeof STRINGS)['en']]: string }

export function str(lang: Lang): UIStrings {
  return STRINGS[lang]
}

export function testLockedLine(lang: Lang, threshold: number, seen: number): string {
  return lang === 'es'
    ? `La prueba se abre con ${threshold} cuadros vistos. Llevas ${seen}.`
    : `The Test opens at ${threshold} paintings seen. ${seen} so far.`
}

export function centuryName(year: number, lang: Lang): string {
  const c = Math.ceil(year / 100)
  if (lang === 'es') return `Siglo ${c}`
  const suffix = c % 10 === 1 && c !== 11 ? 'st' : c % 10 === 2 && c !== 12 ? 'nd' : c % 10 === 3 && c !== 13 ? 'rd' : 'th'
  return `${c}${suffix} century`
}
