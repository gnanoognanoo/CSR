import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getMemberInitials, type Member } from './data';
import './overlays.css';

interface MemberProfileProps {
  member: Member | null;
  onClose: () => void;
  origin?: MemberProfileOrigin | null;
}

export interface MemberProfileOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function acquireMemberScrollLock(body: Pick<HTMLElement, 'style'> = document.body): () => void {
  const previousOverflow = body.style.overflow;
  // The orbit already locks page scrolling. Its lifecycle remains authoritative.
  if (previousOverflow === 'hidden') return () => {};
  body.style.overflow = 'hidden';
  return () => { body.style.overflow = previousOverflow; };
}

export function MemberProfile({ member, onClose, origin }: MemberProfileProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!member || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireMemberScrollLock();
    dialog.showModal();
    const sheet = sheetRef.current;
    if (sheet && origin && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sheet.style.animation = 'none';
      const bounds = sheet.getBoundingClientRect();
      const coordinates = [origin.x, origin.y, origin.width, origin.height];
      if (coordinates.every(Number.isFinite) && origin.width > 0 && origin.height > 0 && bounds.width > 0 && bounds.height > 0) {
        sheet.style.setProperty('--profile-reveal-x', `${origin.x + origin.width / 2 - bounds.x - bounds.width / 2}px`);
        sheet.style.setProperty('--profile-reveal-y', `${origin.y + origin.height / 2 - bounds.y - bounds.height / 2}px`);
        sheet.style.setProperty('--profile-reveal-scale-x', `${Math.min(1, origin.width / bounds.width)}`);
        sheet.style.setProperty('--profile-reveal-scale-y', `${Math.min(1, origin.height / bounds.height)}`);
        dialog.dataset.reveal = 'card';
      }
      sheet.style.removeProperty('animation');
    }
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      delete dialog.dataset.reveal;
      releaseScrollLock();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [member?.id, origin]);

  if (!member) return null;
  const fields = [
    ['Division', member.division],
    ['Role', member.role],
    ['Year', member.year],
    ['Department', member.department],
  ].filter(([, value]) => Boolean(value));

  return createPortal(
    <dialog ref={dialogRef} className="members-profile" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <article ref={sheetRef} className="members-profile__sheet">
        <div className="members-profile__topline">
          <p>CSR-RIT <span>/</span> Member profile</p>
          <button ref={closeRef} type="button" className="members-overlay-close" onClick={onClose} aria-label="Close member profile">Back to orbit <span aria-hidden="true">×</span></button>
        </div>
        <div className={`members-profile__layout${fields.length === 0 ? ' members-profile__layout--identity-only' : ''}`}>
          <header className="members-profile__header">
            <div className="members-profile__badge" aria-hidden="true">
              <small>CSR-RIT</small>
              <span>{getMemberInitials(member.name)}</span>
              <i>Member portfolio</i>
            </div>
            <div className="members-profile__identity">
              <p className="members-overlay-eyebrow">Member portfolio</p>
              <h2 id={titleId}>{member.name}</h2>
              {member.division && <p className="members-profile__division">{member.division}</p>}
              {member.role && <p className="members-profile__role">{member.role}</p>}
            </div>
          </header>
          {fields.length > 0 && <section className="members-profile__information" aria-label="Member information">
            <p className="members-overlay-eyebrow">Community record</p>
            <dl className="members-profile__metadata">
              {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>}
        </div>
        <footer className="members-profile__footer">
          <span>Community for Super Intelligence &amp; Robotics</span>
          <span>Rajalakshmi Institute of Technology</span>
        </footer>
      </article>
    </dialog>, document.body,
  );
}
