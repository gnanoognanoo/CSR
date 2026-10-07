import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { projectDivisions, type Project } from './projects';
import { ModelCredits } from './ModelCredits';
import { acquireDossierScrollLock } from './ProjectDossier';
import './overlays.css';

interface AllProjectsOverlayProps {
  open: boolean;
  archive: readonly Project[];
  initialDivision?: string | null;
  onClose: () => void;
  onOpenProject: (project: Project) => void;
}

const filterLabels: Record<string, string> = {
  ai: 'AI', embedded: 'Embedded', robotics: 'Robotics', software: 'Software',
  iot: 'IoT', research: 'Research', operations: 'Operations',
};

export function AllProjectsOverlay({ open, archive, initialDivision = null, onClose, onOpenProject }: AllProjectsOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [division, setDivision] = useState(initialDivision ?? 'all');
  const titleId = useId();
  const searchId = useId();
  const resultId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    setDivision(initialDivision ?? 'all');
    setQuery('');
  }, [open, initialDivision]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireDossierScrollLock();
    dialog.showModal();
    searchRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      releaseScrollLock();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  const results = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return archive.filter(project => {
      if (division !== 'all' && project.division !== division) return false;
      if (!search) return true;
      const divisionName = projectDivisions.find(candidate => candidate.id === project.division)?.name ?? '';
      return `${project.title} ${project.shortDescription} ${divisionName}`.toLocaleLowerCase().includes(search);
    });
  }, [archive, division, query]);

  if (!open) return null;
  const selectedDivision = projectDivisions.find(candidate => candidate.id === division);
  const scopeCount = division === 'all' ? archive.length : archive.filter(project => project.division === division).length;

  return createPortal(
    <dialog ref={dialogRef} className={`all-projects-overlay ${initialDivision ? 'is-division-view' : ''}`} aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="all-projects-overlay__sheet">
        <header className="all-projects-overlay__header">
          <div>
            <p className="all-projects-overlay__eyebrow">CSR-RIT / Project archive</p>
            <h2 id={titleId}>{selectedDivision?.name ?? 'All projects'}<span aria-hidden="true">.</span></h2>
            {archive.some(project => project.isDemo) && <p className="project-demo-notice"><strong>DEMO ARCHIVE</strong>Sample concepts for interface prototyping. These are not official CSR-RIT projects.</p>}
          </div>
          <button type="button" className="all-projects-overlay__close" onClick={onClose} aria-label={initialDivision ? 'Close division projects' : 'Close all projects'}>Back to orbit <span aria-hidden="true">×</span></button>
        </header>

        <div className="all-projects-overlay__tools">
          <label htmlFor={searchId} className="all-projects-overlay__search-label">Find a project</label>
          <div className="all-projects-overlay__search">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
            <input ref={searchRef} id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Search projects or divisions" autoComplete="off" aria-controls={resultId} />
            {query && <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="Clear project search">×</button>}
          </div>
          <div className="all-projects-overlay__filters" role="group" aria-label="Filter projects by division">
            <button type="button" aria-pressed={division === 'all'} onClick={() => setDivision('all')}>All</button>
            {projectDivisions.map(candidate => <button type="button" key={candidate.id} aria-pressed={division === candidate.id}
              aria-label={candidate.name} onClick={() => setDivision(candidate.id)}>{filterLabels[candidate.id]}</button>)}
          </div>
        </div>

        <section id={resultId} className="all-projects-overlay__results" aria-label="Project search results">
          <div className="all-projects-overlay__result-heading">
            <p>{selectedDivision?.name ?? 'Across all divisions'}</p>
            <p role="status" aria-live="polite">{results.length} {results.length === 1 ? 'project' : 'projects'}</p>
          </div>
          {results.length > 0 ? <ul className="all-projects-overlay__list">
            {results.map(project => {
              const projectDivision = projectDivisions.find(candidate => candidate.id === project.division);
              return <li key={project.id}>
                <button type="button" onClick={() => onOpenProject(project)} aria-label={`Open project: ${project.title}`}>
                  {project.images[0] && <div className="all-projects-overlay__thumbnail"><img src={project.images[0].src} alt={project.images[0].alt} loading="lazy"/></div>}
                  <div className="all-projects-overlay__project-copy">
                    {projectDivision && <p className="all-projects-overlay__division">{projectDivision.name}</p>}
                    <h3>{project.title}</h3>
                    {project.shortDescription && <p className="all-projects-overlay__description">{project.shortDescription}</p>}
                  </div>
                  <div className="all-projects-overlay__project-meta">
                    {project.status && <span>{project.status}</span>}
                    {project.year !== '' && project.year != null && <span>{project.year}</span>}
                  </div>
                  <span className="all-projects-overlay__open" aria-hidden="true">↗</span>
                </button>
              </li>;
            })}
          </ul> : <div className="all-projects-overlay__empty">
            <span aria-hidden="true">—</span>
            <h3>{scopeCount === 0 ? 'No published projects yet' : 'No matching projects'}</h3>
            <p>{scopeCount === 0
              ? selectedDivision ? `There are no published project records for ${selectedDivision.name}.` : 'The archive has no published project records yet.'
              : 'Try a different search or choose another division.'}</p>
            {(query || division !== 'all') && <button type="button" onClick={() => { setQuery(''); setDivision('all'); }}>Clear filters</button>}
          </div>}
        </section>
        <ModelCredits />
      </div>
    </dialog>, document.body,
  );
}
