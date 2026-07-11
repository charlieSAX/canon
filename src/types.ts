export type Lang = 'en' | 'es'

export interface LocalText {
  en: string
  es: string
}

export interface EssaySet {
  scene: string
  craft: string
  painter: string
  point: string
}

export interface Painting {
  id: string
  title: LocalText
  artist: string
  year: number
  movement: string // slug into movements.json
  medium: LocalText
  dimensions: string
  location: { museum: string; city: string }
  image: {
    src: string
    width: number
    height: number
    source_url: string
    license_note: string
  }
  text: { en: EssaySet; es: EssaySet }
  notables: LocalText[]
  fact: LocalText
  draft: boolean
  tags: string[]
}

export interface Movement {
  name: LocalText
  blurb: LocalText
}

export type Movements = Record<string, Movement>

export type Schedule = Record<string, string[]>
