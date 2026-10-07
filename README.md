# CSR-RIT

A scroll-controlled engineering story for the Community for Super Intelligence & Robotics, Rajalakshmi Institute of Technology.

## Run

```sh
npm ci
npm run dev
npm run build
npm run preview
npm test
```

React + Vite + TypeScript, React Router, GSAP/ScrollTrigger, Lenis, Canvas 2D, Three.js and React Three Fiber. Fonts are self-hosted through the installed Fontsource packages. There is no autoplaying video and no third-party telemetry.

## Content and routes

- `/`: scroll-driven engineering story, community figures, division lead disclosures, digital domain explorer and final navigation.
- `/announcements`: white editorial noticeboard with a truthful empty state. No announcement records or backend are configured yet.
- `/projects`: compact 3D project orbit with six visible framed slots backed by eight sample projects. Scroll or drag to browse; select a slot for its detailed dossier. Seven supplied division models revolve and spin, support drag-and-throw motion, and open division project archives. The center hub opens all projects.
- `/members`: interactive member orbit, individual profile disclosures and a searchable directory with division, year and department filters. The center hub opens the complete directory.
- Unknown routes have a return-home state.

Community facts come from the supplied brief. The member roster contains the 115 named division members transcribed from the supplied member list; its summary also counts 13 additional core-team members without individual profiles. Profiles retain the supplied public name, division, role, year and department fields, without adding contact information or invented achievements.

The eight active project previews are the supplied images in `public/projects/uploaded/`. Their sample descriptions, features and suggested technologies are inferred from the images and identified as demo content, not verified official project records or results. Earlier prototype diagrams remain in `public/projects/demo/` with their historical source notes in `docs/demo-sources.md`; the live archive uses the eight uploaded images.

The supplied RIT wordmark and emblem are preserved in `public/brand/`. Optimized desktop and mobile division GLBs, preparation manifests and attribution metadata are in `public/models/projects/`; the interface also exposes the available model credits. Asset-specific licenses remain applicable.

Projects and Members share a restrained engineering particle background. Their interactions use reduced-motion alternatives and responsive fallbacks. Announcements uses a separate scoped white theme and does not change the other pages' typography or colors.

## Sequences

The four supplied archives contain 240 frames each at 1920×1080. All 960 original JPGs are preserved under `public/sequences/`. Each sequence also has 121 mobile images at 768×432, using frame names 0001, 0003, …, 0239 and 0240.

`scripts/import-sequences.py` safely recreates the originals and mobile variants from the four archives. See `public/sequences/manifest.json` for counts and dimensions.

**Sequence 05 was not supplied.** The intelligence chapter intentionally holds the final digital-workspace frame from CLIP 4. To replace it, add the JPGs to `public/sequences/05-digital/`, generate matching mobile derivatives, and change the fifth entry in `src/sequences.ts` to its real folder/count (remove `still`). Update its static reduced-motion image in `src/styles.css` too. The current experience does not request missing fifth-clip assets.

## Motion and loading

- One pinned decorative canvas; HTML remains the content and navigation layer.
- ScrollTrigger maps each chapter's exact bounds to the frame index. Lenis uses the GSAP ticker. Reverse scrolling reverses the sequence; stationary scroll holds a frame.
- A requestAnimationFrame renderer uses cover cropping, focal points and capped DPR (1.5 desktop, 1.25 mobile).
- Four concurrent requests; initial chunk of 24; nearby urgent frames are decoded first. Progressive idle work warms a sliding window. At 55%, the next scene's initial chunk is queued. IntersectionObserver also warms approaching chapters.
- Compressed cache: at most 300 desktop / 160 mobile entries. Decoded cache: at most 24 desktop / 18 mobile images. Evicted ImageBitmaps are explicitly closed. Current frame misses retain the nearest decoded frame or the existing canvas. No full-library preload.
- Small-screen/low-core devices use every second frame, with exact endpoints. Slow rendering can increase the frame step. Touch devices get native scrolling without mouse parallax.
- `prefers-reduced-motion` disables Lenis, frame decoding and parallax, using static representative images and normal content flow. Preference changes are observed live.
- A short indeterminate loader disappears when the first frame is decoded. A connection timeout never blocks reading the page.
- A chapter ResizeObserver refreshes geometry after accordion changes and layout reflow. All effects, requests and observers are cleaned up on route changes.

## Hosting

Build output is `dist/`. The host must rewrite client routes to `index.html` (SPA fallback), serve JPGs as `image/jpeg`, and use compression for text assets. Fingerprinted JS/CSS/font assets can be cached immutably. Sequence filenames are stable: version or invalidate them if replacing an existing clip.

The Sites identity is in `.openai/hosting.json`; preserve it for future updates. The website starts private. Do not put source credentials into the repository.

Source, runtime assets, tests, scripts, the lockfile and hosting metadata are versioned. Dependencies, generated `dist/` output, local QA artifacts, environment files and TypeScript build caches are excluded by `.gitignore`.

## Validation

The regression tests cover frame mapping, mobile filenames, transition cache retention, request priority and disposal; project window selection, orbit physics, model motion, hub and slot geometry; member data, directory filtering and orbit windows; and shared background behavior. Browser checks cover desktop/mobile composition, route navigation, keyboard controls and the interactive overlays. Reduced-motion styling and its no-scrub path are implemented; confirm the OS preference on the target browser as part of release QA.

API references: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) and [Lenis integration](https://github.com/darkroomengineering/lenis).
