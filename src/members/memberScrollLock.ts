export function acquireMemberScrollLock(body: Pick<HTMLElement, 'style'> = document.body): () => void {
  const previousOverflow = body.style.overflow;
  // The orbit already locks page scrolling. Its lifecycle remains authoritative.
  if (previousOverflow === 'hidden') return () => {};
  body.style.overflow = 'hidden';
  return () => { body.style.overflow = previousOverflow; };
}
