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

// User-supplied images remain unchanged and retain their original artwork and branding.
// The eight sample descriptions and technology suggestions are inferred from those images.
// Neither hardware performance, implementation stacks nor official CSR-RIT status are asserted.
export const projects: Project[] = [
  {
    id: 'adaptive-hexapod',
    title: 'Adaptive Hexapod Robot',
    division: 'robotics',
    shortDescription: 'A six-legged reconnaissance concept that adapts its mission to terrain, sensor health and mobility.',
    longDescription: 'The supplied decision-loop poster presents a hexapod with a camera, orientation sensor, joint feedback and a communication antenna. This sample project explores how those inputs could support deliberate choices to continue, adapt, replan, return or stop. A supervisor would see the condition estimates behind each choice instead of treating navigation as a fixed script.',
    problem: 'Uneven terrain and degraded sensing can make a planned route unsuitable for a legged robot. A mission needs to account for changing mobility and communication conditions.',
    approach: 'Model terrain and sensor-health scenarios in simulation, combine joint and orientation feedback into a capability estimate, and rehearse the decision loop on a supervised test course.',
    solution: 'A condition-aware mission controller would adjust gait and route or request a return or stop when its operating assumptions no longer hold.',
    features: ['Six-legged locomotion and adjustable gait', 'Camera, orientation and joint-feedback fusion', 'Capability and mission-risk estimates', 'Continue, adapt, replan, return and stop states'],
    technologies: ['ROS 2 / Python', 'IMU and joint feedback', 'Camera perception', 'Servo control', 'Mission state machine'],
    status: 'SAMPLE · DESIGN STUDY',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-01.png', alt: 'Supplied Adaptive Hexapod Robot poster with a six-legged robot and an adaptive decision loop.' }],
    isDemo: true,
  },
  {
    id: 'portable-signal-workbench',
    title: 'Portable Signal Workbench',
    division: 'embedded',
    shortDescription: 'A compact electronics bench concept for sampling signals and inspecting waveforms on a local display.',
    longDescription: 'The image shows a handheld display board connected to a breadboard beside a portable oscilloscope and laptop. This sample workbench links adjustable acquisition settings with a visible waveform so learners can compare a circuit output against a reference instrument. The emphasis is on explainable measurements and repeatable bench experiments.',
    problem: 'A changing electrical signal can be difficult to diagnose from individual numeric readings. Learners need to see both the waveform and the settings that produced it.',
    approach: 'Begin with low-voltage reference signals, define sampling and input-range limits, then compare captured traces with a bench instrument under repeatable test conditions.',
    solution: 'A small acquisition board and display would present live traces, cursor measurements and capture settings alongside a recorded experiment log.',
    features: ['Local waveform display', 'Adjustable sampling and trigger settings', 'Reference-instrument comparison', 'Exportable experiment captures'],
    technologies: ['Microcontroller ADC', 'C / C++ firmware', 'SPI display', 'Serial data logging', 'Basic signal processing'],
    status: 'SAMPLE · BENCH PROTOTYPE STUDY',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-02.png', alt: 'Supplied electronics bench photograph showing a display board, breadboard, portable oscilloscope and laptop.' }],
    isDemo: true,
  },
  {
    id: 'software-starter-workbench',
    title: 'Software Starter Workbench',
    division: 'software',
    shortDescription: 'A learning workspace that turns familiar app ideas into small, testable software projects.',
    longDescription: 'The supplied software-ideas poster brings together task lists, weather, chat, budgeting, quizzes, commerce and other beginner application themes. This sample project interprets that collection as a modular learning workbench: teams choose an application, define its data model and build one complete user journey before adding integrations. The original poster branding is preserved in the supplied preview.',
    problem: 'New developers often choose a project idea without breaking it into manageable screens, data structures and verifiable behaviour.',
    approach: 'Provide scoped starter briefs, shared interface patterns and milestone checklists, then compare implementations through code review and small acceptance scenarios.',
    solution: 'A guided workspace would connect a project brief, task board, sample data and runnable application modules so learners can progress from an idea to a working demonstration.',
    features: ['Application briefs with clear milestones', 'Task, chat, weather and budgeting modules', 'Shared components and sample data', 'Review checkpoints and acceptance scenarios'],
    technologies: ['React / TypeScript', 'Node.js API', 'SQLite or PostgreSQL', 'REST integration', 'Automated UI checks'],
    status: 'SAMPLE · SOFTWARE CONCEPT',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-03.png', alt: 'Supplied Sterling Technolabs poster showing beginner software project ideas, including task, chat, weather and budgeting applications.' }],
    isDemo: true,
  },
  {
    id: 'tripcrew-planner',
    title: 'TripCrew Group Travel Planner',
    division: 'software',
    shortDescription: 'A shared trip-planning concept that brings itineraries, expense splitting and a simulated group wallet together.',
    longDescription: 'The TripCrew image describes a group travel flow from creating a trip and funding a wallet to recording shared expenses. This sample project focuses on the product workflow: friends coordinate an itinerary, understand who paid, and inspect the resulting split. The business-model figures belong to the supplied illustrative poster; this demo does not process payments or claim revenue.',
    problem: 'Group trips create scattered plans and expenses, making it difficult to understand contributions, balances and agreed activities.',
    approach: 'Prototype trip invitations, itinerary edits and an expense ledger with fictional users and simulated wallet entries before exploring any payment integration.',
    solution: 'A shared trip workspace would keep plans, member contributions and transparent expense splits in one place with a clear transaction history.',
    features: ['Shared itineraries and trip invitations', 'Simulated group-wallet ledger', 'Expense recording and member splits', 'Trip activity and settlement summaries'],
    technologies: ['React / React Native', 'TypeScript', 'Node.js API', 'PostgreSQL', 'Ledger modelling'],
    status: 'SAMPLE · PRODUCT DESIGN CONCEPT',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-04.jpg', alt: 'Supplied TripCrew business-model poster showing trip creation, wallet flows, expense tracking and illustrative revenue ideas.' }],
    isDemo: true,
  },
  {
    id: 'wireless-inspection-rover',
    title: 'Wireless Inspection Rover',
    division: 'robotics',
    shortDescription: 'A wheeled inspection concept with a front-facing camera and a wireless link for remote observation.',
    longDescription: 'The supplied photograph shows a compact four-wheel rover with onboard electronics, antennas and a front-facing camera unit. This sample project explores supervised remote inspection on a bounded course, with a live observation feed and visible connection state. The concept would prioritise predictable motion and a clear stop state when the control link is lost.',
    problem: 'Remote observation needs a stable way to move a camera around obstacles without leaving the operator uncertain about connection or motion state.',
    approach: 'Start with a low-speed indoor course, inspect camera latency and link interruptions, and test steering and stop behaviour under supervision.',
    solution: 'A teleoperation interface would combine the camera feed, basic telemetry and constrained drive controls with a connection-aware stop mechanism.',
    features: ['Live front-camera observation', 'Wireless teleoperation', 'Connection and battery telemetry', 'Low-speed control and link-loss stop'],
    technologies: ['Single-board computer', 'Wi-Fi video streaming', 'Motor driver / PWM', 'Python or C++', 'Camera module'],
    status: 'SAMPLE · ROVER PROTOTYPE STUDY',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-05.png', alt: 'Supplied photograph of a four-wheel inspection rover with antennas, onboard electronics and a front camera.' }],
    isDemo: true,
  },
  {
    id: 'connected-safety-helmet',
    title: 'Connected Safety Helmet',
    division: 'iot',
    shortDescription: 'An instrumented helmet concept for local environmental alerts and connected observation during controlled tests.',
    longDescription: 'The image shows a yellow helmet fitted with a development board, wiring, a display and an external battery. This sample project interprets the assembly as an IoT monitoring demonstrator that could surface environmental readings and wearer-triggered alerts. It is a research concept rather than certified protective equipment, and no safety performance is inferred from the photograph.',
    problem: 'Environmental readings can be difficult to notice when they remain on a separate bench display. An experiment needs timely local feedback and a record of changing conditions.',
    approach: 'Use simulated alerts and reference sensors to study the display, message delivery and mounting arrangement, then review power and ergonomic constraints.',
    solution: 'A connected sensor module would show local readings and send timestamped notifications to a monitoring dashboard for supervised demonstrations.',
    features: ['Local reading and alert display', 'Connected event notifications', 'Timestamped environmental logging', 'Battery and sensor-health indication'],
    technologies: ['Arduino / ESP32-class controller', 'Environmental sensors', 'LCD display', 'MQTT or serial telemetry', 'IoT dashboard'],
    status: 'SAMPLE · IOT PROTOTYPE STUDY',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-06.png', alt: 'Supplied photograph of a yellow helmet fitted with development electronics, wiring, a display and battery.' }],
    isDemo: true,
  },
  {
    id: 'servo-robotic-hand',
    title: 'Servo Robotic Hand',
    division: 'robotics',
    shortDescription: 'An articulated-hand demonstrator for coordinated finger motion, grasp sequences and joint control.',
    longDescription: 'The supplied photograph shows an orange articulated hand with visible servos, wiring and fingertip pads. This sample project explores how separate finger movements could be coordinated into repeatable open, close and grasp sequences. A learner-facing control view would connect requested joint positions to the mechanical response without claiming dexterity or force performance.',
    problem: 'Several finger actuators must move together while respecting mechanical limits. Coordinated motion is difficult to understand when joint positions and sequences are hidden.',
    approach: 'Calibrate individual joint ranges, rehearse slow open-and-close sequences, and compare commanded poses with observed motion using lightweight test objects.',
    solution: 'A joint-control interface would offer pose presets and step-through motion sequences while keeping actuator limits and a reset pose visible.',
    features: ['Independent finger actuation', 'Coordinated grasp presets', 'Joint-range calibration', 'Step-through motion and reset pose'],
    technologies: ['Microcontroller firmware', 'Servo motors / PWM', '3D-printed mechanisms', 'Joint sequencing', 'Serial control interface'],
    status: 'SAMPLE · MECHATRONICS STUDY',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-07.png', alt: 'Supplied photograph of an orange articulated robotic hand with visible servos, wiring and fingertip pads.' }],
    isDemo: true,
  },
  {
    id: 'gesture-controlled-rover',
    title: 'Gesture-Controlled Rover',
    division: 'robotics',
    shortDescription: 'A sensor-glove control concept that translates hand gestures into commands for a small wireless rover.',
    longDescription: 'The image pairs a glove carrying finger sensors with a microcontroller-based rover and radio hardware. This sample project explores an intuitive control link: calibrated hand gestures become constrained drive commands while neutral or disconnected states stop the vehicle. A companion display would make the gesture-to-command mapping easy to inspect during demonstrations.',
    problem: 'A wearable controller needs a clear and repeatable mapping between sensor readings and rover movement, including an unambiguous neutral state.',
    approach: 'Record relaxed and bent-finger baselines, map a small set of gestures to low-speed commands, and test transitions and radio interruptions on a bounded course.',
    solution: 'A calibrated glove controller would send discrete commands to the rover, with visible connection state and a stop command when input is neutral or stale.',
    features: ['Finger-sensor calibration', 'Gesture-to-drive command mapping', 'Wireless command link', 'Neutral-state and stale-input stop'],
    technologies: ['Arduino-class controllers', 'Flex sensors / analog input', 'Wireless radio modules', 'DC motor driver', 'Gesture thresholds'],
    status: 'SAMPLE · INTERACTION PROTOTYPE STUDY',
    year: 'Sample concept',
    contributors: ['Demo team — not assigned'],
    images: [{ src: '/projects/uploaded/project-08.png', alt: 'Supplied photograph of a flex-sensor glove beside a two-wheel rover and wireless microcontroller boards.' }],
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
