import { getMemberInitials, memberDivisions, type Member } from './data'

/** Concise identity content shared by the sharp live badge labels. */
export function getMemberBadgeLabel(member: Member, focused = false) {
  const division = memberDivisions.find(item => item.id === member.divisionId || item.name === member.division)
  const divisionShort = division?.shortName ?? member.division ?? null
  const metadata = focused ? member.year ?? null : null
  return {
    // Retain the source spelling and full identity for DOM text and accessibility.
    name: member.name,
    initials: getMemberInitials(member.name),
    divisionShort,
    metadata,
    secondary: focused ? [divisionShort, metadata].filter(Boolean).join(' · ') || null : null,

  }
}
