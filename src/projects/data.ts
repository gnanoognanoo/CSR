import { divisions } from '../content';

const divisionIds = ['ai', 'embedded', 'robotics', 'software', 'iot', 'research', 'operations'] as const;

export interface ProjectDivision {
  id: string;
  /** Display number. Array positions and ring math remain zero based. */
  index: number;
  name: string;
  members: number;
  lead: string;
}

export const projectDivisions: ProjectDivision[] = divisions.map(([name, members, lead], index) => ({
  id: divisionIds[index], index: index + 1, name, members, lead,
}));

export interface Project {
  id: string;
  title: string;
  /** A stable ID from projectDivisions. */
  division: string;
  shortDescription: string;
  longDescription: string;
  status: string;
  year: string | number;
  contributors: string[];
  technologies: string[];
  images: { src: string; alt: string }[];
  problem?: string;
  approach?: string;
  solution?: string;
  features?: string[];
  results?: string;
  githubUrl?: string;
  demoUrl?: string;
  /** Sample descriptions are inferred from supplied media, not verified project records. */
  isDemo?: boolean;
  inspirationUrl?: string;
  sourceLabel?: string;
}

// User-supplied images remain unchanged and retain their original artwork.
// Project text details have been replaced with placeholders for upcoming cohort records.
export const projects: Project[] = [
  {
    id: 'adaptive-hexapod',
    title: 'Project 01 — Title Placeholder',
    division: 'robotics',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-01.png', alt: 'Project 01 prototype photograph' }],
    isDemo: true,
  },
  {
    id: 'portable-signal-workbench',
    title: 'Project 02 — Title Placeholder',
    division: 'embedded',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-02.png', alt: 'Project 02 prototype photograph' }],
    isDemo: true,
  },
  {
    id: 'software-starter-workbench',
    title: 'Project 03 — Title Placeholder',
    division: 'software',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-03.png', alt: 'Project 03 prototype photograph' }],
    isDemo: true,
  },
  {
    id: 'tripcrew-planner',
    title: 'Project 04 — Title Placeholder',
    division: 'software',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-04.jpg', alt: 'Project 04 prototype photograph' }],
    isDemo: true,
  },
  {
    id: 'wireless-inspection-rover',
    title: 'Project 05 — Title Placeholder',
    division: 'robotics',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-05.png', alt: 'Project 05 prototype photograph' }],
    isDemo: true,
  },
  {
    id: 'connected-safety-helmet',
    title: 'Project 06 — Title Placeholder',
    division: 'iot',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-06.png', alt: 'Project 06 prototype photograph' }],
    isDemo: true,
  },
  {
    id: 'servo-robotic-hand',
    title: 'Project 07 — Title Placeholder',
    division: 'robotics',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-07.png', alt: 'Project 07 prototype photograph' }],
    isDemo: true,
  },
  {
    id: 'gesture-controlled-rover',
    title: 'Project 08 — Title Placeholder',
    division: 'robotics',
    shortDescription: 'Project brief and technical overview placeholder. Full specifications will be published upon cohort review.',
    longDescription: 'This project is currently under active development by the division. Comprehensive technical specifications, documentation, schematics, and source code will be published here upon cohort milestone completion.',
    problem: 'Problem statement placeholder defining the core technical challenge and engineering objective.',
    approach: 'Methodology and experimentation plan placeholder outlining development milestones and testing frameworks.',
    solution: 'Engineering architecture and implementation solution placeholder.',
    features: ['Feature specification in progress', 'Hardware and software integration', 'Telemetry and diagnostics logging', 'Field testing and validation pending'],
    technologies: ['Technology Stack TBD', 'Framework Placeholder', 'Hardware / API Integration'],
    status: 'IN DEVELOPMENT · PLACEHOLDER',
    year: '2026',
    contributors: ['CSR Cohort Team — Unassigned'],
    images: [{ src: '/projects/uploaded/project-08.png', alt: 'Project 08 prototype photograph' }],
    isDemo: true,
  },
];

export function getDivisionProjects(id: string, archive: readonly Project[] = projects): Project[] {
  return archive.filter(project => project.division === id);
}

export function safeProjectUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
