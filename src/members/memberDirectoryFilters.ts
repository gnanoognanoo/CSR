import { searchMembers, type Member } from './data';

export interface MemberDirectoryFilters {
  query: string;
  division: string;
  year: string;
  department: string;
}

export function filterMemberDirectory(members: readonly Member[], filters: MemberDirectoryFilters): Member[] {
  return searchMembers(members, filters.query).filter(member => {
    if (filters.division !== 'all' && member.divisionId !== filters.division) return false;
    if (filters.year !== 'all' && member.year !== filters.year) return false;
    if (filters.department !== 'all' && member.department !== filters.department) return false;
    return true;
  });
}
