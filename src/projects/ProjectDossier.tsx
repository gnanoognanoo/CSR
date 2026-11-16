import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDivisionProjects, safeProjectUrl, type Project } from './data';

interface ProjectDossierProps {
  project: Project | null;
  divisionName: string;
  projectNumber?: number;
  backLabel?: string;
  onClose: () => void;
}

export function acquireDossierScrollLock(body: Pick<HTMLElement, 'style'> = document.body): () => void {
  const previousOverflow = body.style.overflow;
  // An engaged orbit already owns this lock. Its cleanup must remain authoritative.
  if (previousOverflow === 'hidden') return () => {};
  body.style.overflow = 'hidden';
  return () => { body.style.overflow = previousOverflow; };
}

export function ProjectDossier({ project, divisionName, projectNumber: suppliedNumber, backLabel = 'Back to orbit', onClose }: ProjectDossierProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!project || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const source = suppliedNumber && !document.querySelector('.all-projects-overlay[open]')
      ? document.querySelector<HTMLButtonElement>(`.ring-project[data-project-number="${suppliedNumber}"]`)
      : null;
    const origin = source?.getBoundingClientRect();
    const releaseScrollLock = acquireDossierScrollLock();
    setClosing(false);
    dialog.showModal();
    const sheet = sheetRef.current;
    if (sheet && origin && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sheet.style.animation = 'none';
      const bounds = sheet.getBoundingClientRect();
      if ([origin.x, origin.y, origin.width, origin.height].every(Number.isFinite) && origin.width > 0 && origin.height > 0 && bounds.width > 0 && bounds.height > 0) {
        sheet.style.setProperty('--dossier-reveal-x', `${origin.x + origin.width / 2 - bounds.x - bounds.width / 2}px`);
        sheet.style.setProperty('--dossier-reveal-y', `${origin.y + origin.height / 2 - bounds.y - bounds.height / 2}px`);
        sheet.style.setProperty('--dossier-reveal-scale-x', `${Math.min(1, origin.width / bounds.width)}`);
        sheet.style.setProperty('--dossier-reveal-scale-y', `${Math.min(1, origin.height / bounds.height)}`);
        dialog.dataset.reveal = 'slot';
      }
      sheet.style.removeProperty('animation');
    }
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      dialog.close();
      delete dialog.dataset.reveal;
      releaseScrollLock();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [project?.id, suppliedNumber]);

  function requestClose() {
    if (closeTimer.current) return;
    setClosing(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      onCloseRef.current();
    }, reducedMotion ? 0 : 220);
  }

  if (!project) return null;
  const projectIndex = getDivisionProjects(project.division).findIndex(candidate => candidate.id === project.id);
  const projectNumber = suppliedNumber ? String(suppliedNumber).padStart(2, '0') : projectIndex >= 0 ? String(projectIndex + 1).padStart(2, '0') : project.id;
  const demoUrl = safeProjectUrl(project.demoUrl);
  const githubUrl = safeProjectUrl(project.githubUrl);
  const inspirationUrl = safeProjectUrl(project.inspirationUrl);
  const sections = [
    ['The problem', project.problem], ['The approach', project.approach],
    ['The solution', project.solution],
  ];

  return createPortal(
    <dialog ref={dialogRef} className="project-dossier" aria-labelledby={titleId}
      data-state={closing ? 'closing' : 'open'}
      onCancel={event => { event.preventDefault(); requestClose(); }}
      onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>
      <article ref={sheetRef} className="project-dossier__sheet">
        <div className="project-dossier__topline">
          <p>Project {projectNumber} <span>/</span> {divisionName}</p>
          <button ref={closeRef} type="button" className="project-dossier__close" onClick={requestClose} data-cursor="BACK" aria-label="Close project dossier">← {backLabel}</button>
        </div>
        <header className="project-dossier__header">
          <p className="project-dossier__eyebrow">CSR-RIT / {project.isDemo ? 'Demo engineering concept' : 'Engineering dossier'}</p>
          <h2 id={titleId}>{project.title}</h2>
          {project.isDemo && <p className="project-demo-notice"><strong>DEMO PROJECT · IMAGE-BASED CONCEPT</strong>Sample descriptions and likely technologies inferred from the supplied image; not an official CSR-RIT project.</p>}
          {project.shortDescription && <p className="project-dossier__summary">{project.shortDescription}</p>}
          <dl className="project-dossier__metadata">
            {project.status && <div><dt>Status</dt><dd>{project.status}</dd></div>}
            {project.year !== '' && project.year != null && <div><dt>Year</dt><dd>{project.year}</dd></div>}
          </dl>
        </header>
        {project.images.length > 0 && <div className="project-dossier__visuals">
          {project.images.map((image, index) => <figure key={`${image.src}-${index}`}>
            <img src={image.src} alt={image.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
          </figure>)}
        </div>}
        <div className="project-dossier__body">
          {project.longDescription && <section className="project-dossier__section project-dossier__overview"><h3>Project overview</h3><p>{project.longDescription}</p></section>}
          {sections.filter(([, value]) => Boolean(value)).map(([label, value]) => <section className="project-dossier__section" key={label}><h3>{label}</h3><p>{value}</p></section>)}
          {project.features?.length ? <section className="project-dossier__section"><h3>Key features</h3><ul className="project-dossier__features">{project.features.map(feature => <li key={feature}>{feature}</li>)}</ul></section> : null}
          {project.technologies.length > 0 && <section className="project-dossier__section"><h3>{project.isDemo ? 'Likely technologies' : 'Technologies'}</h3><ul className="project-dossier__technologies">{project.technologies.map(technology => <li key={technology}>{technology}</li>)}</ul></section>}
          {project.contributors.length > 0 && <section className="project-dossier__section"><h3>Contributors</h3><ul className="project-dossier__contributors">{project.contributors.map((contributor, index) => <li key={`${contributor}-${index}`}>{contributor}</li>)}</ul></section>}
          {project.results && <section className="project-dossier__section"><h3>Results</h3><p>{project.results}</p></section>}
        </div>
        {(demoUrl || githubUrl) && <footer className="project-dossier__links">
          {demoUrl && <a href={demoUrl} target="_blank" rel="noopener noreferrer">View demo ↗</a>}
          {githubUrl && <a href={githubUrl} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
        </footer>}
        {inspirationUrl && <p className="project-concept-source">Concept reference <a href={inspirationUrl} target="_blank" rel="noopener noreferrer">{project.sourceLabel || 'Read the source'} ↗</a></p>}
        <p className="project-dossier__institution">Community for Super Intelligence &amp; Robotics · Rajalakshmi Institute of Technology, Chennai</p>
      </article>
    </dialog>, document.body,
  );
}
