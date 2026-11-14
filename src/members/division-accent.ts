import { memberDivisions, type Member } from './data'

/** Presentation-only accent per technical division. Tuned for contrast on the white badge face. */
export interface DivisionAccent {
  readonly accent: string
  /** Lighter companion used for glow nodes and gradients. */
  readonly glow: string
  readonly label: string
}

const ACCENTS: Readonly<Record<string, { accent: string; glow: string }>> = {
  ai: { accent: '#1677C8', glow: '#4AC3E8' },
  embedded: { accent: '#0F9488', glow: '#3FD3C1' },
  robotics: { accent: '#E0702F', glow: '#FFA266' },
  software: { accent: '#5457D6', glow: '#8E91FF' },
  iot: { accent: '#23955A', glow: '#4FD08C' },
  research: { accent: '#9447C8', glow: '#C58AF0' },
  operations: { accent: '#C2850C', glow: '#F2B940' },
}

const FALLBACK = { accent: '#1677C8', glow: '#4AC3E8' }

export function getDivisionAccent(member: Pick<Member, 'division'> & { divisionId?: string }): DivisionAccent {
  const division = memberDivisions.find(item => item.id === member.divisionId || item.name === member.division)
  const colors = (division && ACCENTS[division.id]) ?? FALLBACK
  return { ...colors, label: division?.shortName ?? member.division ?? 'CSR' }
}

export function getDivisionAccentById(id: string): string {
  return (ACCENTS[id] ?? FALLBACK).accent
}
