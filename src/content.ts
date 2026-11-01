export const navigation = [['/', 'Home'], ['/announcements', 'Announcements'], ['/projects', 'Projects'], ['/members', 'Member portfolio'], ['/join', 'Join Community']];
import { memberDivisions } from './members/data';
export const divisions = memberDivisions.map(division => [division.name, division.lead ?? ''] as const);
export const digital = [
  { name:'AI & Intelligent Systems', code:'AI', headline:'Teach systems to see.\nAnd to understand.', description:'Explore how data becomes insight and how intelligent systems make decisions.', areas:['Computer vision', 'Machine learning', 'Intelligent systems', 'Data-driven decision making'] },
  { name:'Embedded & Electronics', code:'EMB', headline:'Bridge hardware & code.\nPower the machine.', description:'Design circuits, microcontrollers, and low-level firmware that bring hardware to life.', areas:['Circuit design', 'Microcontrollers', 'Firmware', 'VLSI & Signal processing'] },
  { name:'Robotics & Autonomous Systems', code:'ROB', headline:'Sense. Decide.\nMove with purpose.', description:'Bring hardware and intelligence together through control and autonomous behaviour.', areas:['Control', 'Navigation', 'Simulation', 'Autonomous systems'] },
  { name:'Software Engineering', code:'SW', headline:'Build the logic.\nConnect the system.', description:'Turn ideas into applications and the architecture that makes them work.', areas:['Applications', 'Backend systems & APIs', 'Databases', 'Software architecture'] },
  { name:'IoT & Smart Systems', code:'IoT', headline:'Connect the physical.\nUnderstand the signal.', description:'Explore connected devices and the communication between sensors, software and people.', areas:['Connected devices', 'Sensor data', 'Real-time monitoring', 'Communication systems'] },
  { name:'Research & Publications', code:'R&D', headline:'Ask better questions.\nFind new possibilities.', description:'Investigate ideas methodically and communicate what you learn.', areas:['Experimentation', 'Technical documentation', 'Analysis', 'Publications'] },
  { name:'Operations & Management', code:'OPS', headline:'Make collaboration\nwork in practice.', description:'Bring people, plans and technical work together so a community can build together.', areas:['Planning', 'Coordination', 'Community execution'] },
];
