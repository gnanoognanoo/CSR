import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMemberInitials, searchMembers, type Member } from './data';
import { acquireMemberScrollLock } from './MemberProfile';
import './overlays.css';

interface DirectoryDivision {
  id: string;
  name: string;
  shortName: string;
  lead?: string;
}

interface MemberDirectoryProps {
  open: boolean;
  members: readonly Member[];
  divisions: readonly DirectoryDivision[];
  onClose: () => void;
  onSelect: (member: Member) => void;
}

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

export function MemberDirectory({ open, members, divisions, onClose, onSelect }: MemberDirectoryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [division, setDivision] = useState('all');
  const [year, setYear] = useState('all');
  const [department, setDepartment] = useState('all');
  const titleId = useId();
  const searchId = useId();
  const divisionId = useId();
  const yearId = useId();
  const departmentId = useId();
  const resultId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireMemberScrollLock();
    dialog.showModal();
    searchRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      releaseScrollLock();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  const options = useMemo(() => ({
    years: [...new Set(members.map(member => member.year).filter((value): value is string => Boolean(value)))].sort(),
    departments: [...new Set(members.map(member => member.department).filter((value): value is string => Boolean(value)))].sort(),
  }), [members]);
  const results = useMemo(() => filterMemberDirectory(members, { query, division, year, department }), [members, query, division, year, department]);
  const filtered = Boolean(query || division !== 'all' || year !== 'all' || department !== 'all');

  function clearFilters() {
    setQuery(''); setDivision('all'); setYear('all'); setDepartment('all');
    searchRef.current?.focus({ preventScroll: true });
  }

  if (!open) return null;
  return createPortal(
    <dialog ref={dialogRef} className="members-directory" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="members-directory__sheet">
        <header className="members-directory__header">
          <div><p className="members-overlay-eyebrow">CSR-RIT / Member portfolio</p><h2 id={titleId}>Member directory<span aria-hidden="true">.</span></h2></div>
          <button type="button" className="members-overlay-close" onClick={onClose} aria-label="Close member directory">Back to orbit <span aria-hidden="true">×</span></button>
        </header>
        <div className="members-directory__tools">
          <div className="members-directory__search">
            <label htmlFor={searchId}>Find a member</label>
            <div><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
              <input ref={searchRef} id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, division or department" autoComplete="off" aria-controls={resultId} />
              {query && <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="Clear member search">×</button>}
            </div>
          </div>
          <div className="members-directory__filter"><label htmlFor={divisionId}>Division</label><select id={divisionId} value={division} onChange={event => setDivision(event.target.value)}><option value="all">All divisions</option>{divisions.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></div>
          <div className="members-directory__filter"><label htmlFor={yearId}>Year</label><select id={yearId} value={year} onChange={event => setYear(event.target.value)}><option value="all">All years</option>{options.years.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
          <div className="members-directory__filter"><label htmlFor={departmentId}>Department</label><select id={departmentId} value={department} onChange={event => setDepartment(event.target.value)}><option value="all">All departments</option>{options.departments.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
        </div>
        <section id={resultId} className="members-directory__results" aria-label="Member search results">
          <div className="members-directory__result-heading"><p role="status" aria-live="polite">{results.length} of {members.length} members</p>{filtered && <button type="button" onClick={clearFilters}>Clear filters</button>}</div>
          {results.length > 0 ? <div className="members-directory__table-wrap"><table className="members-directory__table">
            <caption className="members-visually-hidden">CSR-RIT members. Select a name to focus that member in the orbit.</caption>
            <thead><tr><th scope="col">Member</th><th scope="col">Division</th><th scope="col">Year</th><th scope="col">Department</th><th scope="col"><span className="members-visually-hidden">Orbit</span></th></tr></thead>
            <tbody>{results.map(member => <tr key={member.id}>
              <th scope="row"><button type="button" onClick={() => { onSelect(member); onClose(); }} aria-label={`Focus ${member.name} in orbit`}><span className="members-directory__initials" aria-hidden="true">{getMemberInitials(member.name)}</span><span>{member.name}{member.role && <small>{member.role}</small>}</span></button></th>
              <td>{member.division || '—'}</td><td>{member.year || '—'}</td><td>{member.department || '—'}</td><td aria-hidden="true">↗</td>
            </tr>)}</tbody>
          </table></div> : <div className="members-directory__empty"><span aria-hidden="true">—</span><h3>No matching members</h3><p>Try another name or adjust the filters.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>}
        </section>
        <footer className="members-directory__footer">Rajalakshmi Institute of Technology <span>CSR-RIT</span></footer>
      </div>
    </dialog>, document.body,
  );
}
