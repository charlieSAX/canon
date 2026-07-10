export interface Painting {
  id: string
  title: string
  artist: string
  year: number
  movement: string
  medium: string
  dimensions: string
  location: { museum: string; city: string }
  image: {
    src: string
    width: number
    height: number
    source_url: string
    license_note: string
  }
  text: { scene: string; craft: string; painter: string }
  draft: boolean
  fact: string
  tags: string[]
}

export type Schedule = Record<string, string[]>
