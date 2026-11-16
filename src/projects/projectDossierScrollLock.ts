export function acquireDossierScrollLock(body: Pick<HTMLElement, 'style'> = document.body): () => void {
  const previousOverflow = body.style.overflow;
  // An engaged orbit already owns this lock. Its cleanup must remain authoritative.
  if (previousOverflow === 'hidden') return () => {};
  body.style.overflow = 'hidden';
  return () => { body.style.overflow = previousOverflow; };
}
