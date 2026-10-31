import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sequences } from './sequences';
import { useExperience } from './useExperience';
import { useHomeFonts } from './useHomeFonts';
import { Label, Divisions, DigitalExplorer, Footer } from './components';
import { memberDivisions, getMemberStats, type Member } from './members/data';
import { getMembers } from './services/members';

const engineeringDomains = ['Mechanical design', 'Electronics', 'Embedded control', 'Software', 'Artificial intelligence', 'Data', 'Connectivity', 'Testing', 'Research'];
const philosophy = [
  ['Learn.', 'Explore technologies beyond classroom theory.'],
  ['Build.', 'Turn ideas into software, simulations, circuits, prototypes and experiments.'],
  ['Collaborate.', 'Work with students across different engineering domains.'],
  ['Create impact.', 'Use technical knowledge to solve meaningful problems.'],
];
const opportunities = ['Learn technologies', 'Build projects', 'Work across divisions', 'Participate in technical workshops', 'Collaborate for hackathons', 'Explore research', 'Develop a technical portfolio', 'Turn ideas into working systems'];

export default function Home() {
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [memberStatsAvailable, setMemberStatsAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    getMembers().then(result => {
      if (!active) return;
      if (result.fromSupabase || !result.error) setMembers(result.members);
      setMemberStatsAvailable(!result.error);
    }).catch(() => { if (active) setMemberStatsAvailable(false); });
    return () => { active = false; };
  }, []);
  const memberStats = useMemo(() => getMemberStats(members), [members]);
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const { chapter, ready, failed, reduced } = useExperience(root, canvas);
  const fonts = useHomeFonts();
  return <main id="main-content" className={`home-page ${reduced ? 'reduced-motion' : ''}`} data-home-fonts={fonts}>
    <div ref={root} className="experience">
      <div className="cinema" aria-hidden="true"><canvas ref={canvas}/><div className="cinema-shade"/></div>
      {!ready && <div className="experience-loader" role="status"><strong>CSR-RIT</strong><span className="mono">PREPARING THE ENGINEERING EXPERIENCE</span><span className="loading-line"/></div>}
      {failed && <p className="frame-notice" role="status">The visual sequence is unavailable. Explore the full CSR story below.</p>}
      <nav className="chapter-nav" aria-label="Story chapters">{sequences.map((scene, i) => <a href={`#${scene.id}`} aria-label={`0${i + 1} ${scene.label}`} key={scene.id} className={chapter === i ? 'current' : ''} aria-current={chapter === i ? 'step' : undefined}><span className="chapter-number">0{i + 1}</span><span className="chapter-name">{scene.label}</span><span className="chapter-dash"/></a>)}</nav>

      <section id="begin" className="chapter chapter-begin" data-chapter="0" aria-label="CSR at Rajalakshmi Institute of Technology">
        <div className="hero story-beat">
          <div className="hero-content">
            <Label><span className="institution-label">RAJALAKSHMI INSTITUTE OF TECHNOLOGY<span>CHENNAI</span></span></Label>
            <h1 className="hero-title"><span className="hero-title-ink">CSR<span className="hero-title-dash">—</span>RIT</span></h1>
            <p className="hero-fullname"><span className="hero-community">Community for</span><br/><strong><span className="hero-intelligence">Super Intelligence</span><br/><span className="hero-robotics">& Robotics</span></strong></p>
            <p className="hero-tagline">A student engineering community where ideas move from learning to design, software, prototypes, research and real-world systems.</p>
            <a className="explore" href="#about"><span className="scroll-symbol" aria-hidden="true">↓</span>Scroll to explore<span className="explore-line"/></a>
          </div>
          <div className="hero-annotation mono"><span className="crosshair" aria-hidden="true">+</span><span>BUILT BY STUDENTS.<br/><span className="annotation-muted">DRIVEN BY ENGINEERING.</span></span></div>
          <div className="hero-bottom mono"><span>01 / CSR AT RIT</span><span>A STUDENT ENGINEERING COMMUNITY AT RIT</span><span>CHENNAI, INDIA</span></div>
        </div>

        <div id="about" className="story-beat about-beat">
          <div className="section-wrap">
            <Label number="02">WHAT IS CSR?</Label>
            <div className="split-story">
              <div data-parallax="40"><h2>A community<br/>for <span className="accent">builders.</span></h2><p className="campus-caption mono">RAJALAKSHMI INSTITUTE OF TECHNOLOGY<br/>CHENNAI / STUDENT TECHNICAL COMMUNITY</p></div>
              <div className="prose" data-reveal>
                <p className="lead">Community for<br/><em>Super Intelligence & Robotics.</em></p>
                <p>CSR-RIT is a student-led, multidisciplinary technical community within Rajalakshmi Institute of Technology, Chennai.</p>
                <p>A place to learn, experiment, build and collaborate beyond the classroom — connecting students from different technical backgrounds into one engineering community.</p>
                <p className="domain-intro">Artificial intelligence. Robotics. Embedded systems. Software engineering. IoT. Research. Technology management.</p>
              </div>
            </div>
            <div className="technical-rule" aria-hidden="true"><span>STUDENTS / PROJECTS / RESEARCH</span><i/><span>ONE CAMPUS. SHARED POSSIBILITIES.</span></div>
          </div>
        </div>

        <div className="story-beat why-beat">
          <div className="section-wrap">
            <Label number="03">WHY CSR?</Label>
            <h2 className="statement" data-reveal>Modern engineering<br/>is <span className="accent">multidisciplinary.</span></h2>
            <p className="body-copy max-copy" data-reveal>A real engineering system rarely belongs to one domain. A robotics project connects many disciplines. CSR creates one place where students from these areas can work together.</p>
            <div className="engineering-system" aria-label="Disciplines connected in an engineering system">
              <div className="system-origin mono" data-parallax="15"><span className="system-node" aria-hidden="true"/>ONE WORKING SYSTEM</div>
              <ul>{engineeringDomains.map((name, i) => <li data-reveal key={name}><span className="mono">0{i + 1}</span>{name}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section id="design" className="chapter chapter-design" data-chapter="1" aria-label="How CSR works">
        <div className="story-beat design-intro">
          <div className="section-wrap">
            <Label number="04">HOW CSR WORKS</Label>
            <h2 className="display-heading" data-parallax="50">From RIT classrooms<br/>to <span className="accent">real engineering.</span></h2>
            <p className="chapter-intro" data-reveal>Explore an idea. Give it a design. Put it to the test.</p>
            <div className="process-scale" aria-label="Engineering process">{['Idea', 'Design', 'Prototype', 'Test', 'Iterate'].map((s, i) => <span key={s} data-reveal><small>0{i + 1}</small>{s}</span>)}</div>
          </div>
          <span className="scene-note mono" data-parallax="20">CSR-RIT / IDEAS TAKE SHAPE</span>
        </div>
        <div className="story-beat how-beat">
          <div className="section-wrap">
            <Label>THE STUDENT ENGINEERING PROCESS</Label>
            <div className="split-story">
              <h2 data-parallax="40">A process.<br/>Not a<br/><span className="accent">straight line.</span></h2>
              <div className="process-list">{[
                ['Explore', 'Understand a problem, ask questions and investigate possible approaches.'],
                ['Design', 'Convert ideas into architectures, algorithms, circuits or mechanical designs.'],
                ['Build', 'Create software, prototypes, experiments and technical demonstrations.'],
                ['Iterate', 'Test, learn from failure and improve the system together.'],
              ].map(([name, copy], i) => <div className="process-item" data-reveal key={name}><span className="process-node mono">0{i + 1}</span><div><h3>{name}</h3><p>{copy}</p></div></div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="build" className="chapter chapter-build" data-chapter="2" aria-label="Learn, build, collaborate and create impact">
        <div className="story-beat build-intro">
          <div className="section-wrap">
            <Label>THE CSR PHILOSOPHY</Label>
            <div className="philosophy-list">{philosophy.map(([name, copy], i) => <div className="philosophy-row" key={name} data-reveal><span className="mono">0{i + 1}</span><h2 className={i === 3 ? 'accent' : ''}>{name}</h2><p>{copy}</p></div>)}</div>
            <p className="scene-caption mono" data-parallax="15">KNOWLEDGE SHARED.<br/>IDEAS PUT INTO PRACTICE.</p>
          </div>
        </div>
        <div className="story-beat theory-beat">
          <div className="section-wrap narrow-wrap">
            <Label>RIT STUDENT ENGINEERING COMMUNITY</Label>
            <h2 data-reveal>From theory<br/>to <span className="accent">working<br/>systems.</span></h2>
            <div className="prose" data-reveal><p>Learning a technology is the starting point. Applying it is where engineering begins.</p><p>At CSR-RIT, students can put classroom knowledge into practice through software, simulations, circuits, prototypes and research experiments.</p></div>
          </div>
        </div>
        <div className="story-beat opportunities-beat">
          <div className="section-wrap">
            <Label>LEARNING ACROSS DISCIPLINES</Label>
            <div className="split-story collaboration-story">
              <h2 data-parallax="35">Different minds.<br/><span className="accent">Shared<br/>possibilities.</span></h2>
              <div className="prose" data-reveal><p className="lead">Your discipline is<br/><em>a starting point.</em></p><p>A software idea may need a sensor. A prototype may need a control system. A research question may need a new experiment.</p><p>CSR brings students across these domains into the same conversation — to share knowledge, learn from one another and build together.</p><p className="campus-caption mono">ONE CAMPUS / CONNECTED PERSPECTIVES</p></div>
            </div>
            <div className="technical-rule" aria-hidden="true"><span>LEARN TOGETHER</span><i/><span>BUILD TOGETHER</span></div>
          </div>
        </div>
      </section>

      <section id="community" className="chapter chapter-community" data-chapter="3" aria-label="Our community and divisions">
        <div className="story-beat community-intro"><div className="section-wrap"><Label number="05">THE COMMUNITY / RIT CHENNAI</Label><p className="chapter-intro" data-reveal>Built by students. Connected by engineering.</p><h2 className="display-heading" data-reveal>One campus.<br/>{memberStats.divisions} divisions.<br/><span className="accent">{memberStatsAvailable ? memberStats.total : '—'} minds.</span></h2></div></div>
        <div className="community-numbers section-wrap">
          <Label>THE PEOPLE BEHIND CSR-RIT</Label>
          <div className="stat-big story-beat" data-reveal><span className="stat-value" data-parallax="80">{memberStatsAvailable ? memberStats.total : '—'}</span><div><span className="mono accent">TOTAL MEMBERS</span><p>Different perspectives.<br/>A shared drive to build.</p></div></div>
          <div className="stat-big story-beat" data-reveal><span className="stat-value" data-parallax="80">{memberStatsAvailable ? memberStats.divisionMembers : '—'}</span><div><span className="mono accent">MEMBERS PLACED INTO DIVISIONS</span><p>Finding their strengths.<br/>Connecting their ideas.</p></div></div>
          <div className="stat-big story-beat" data-reveal><span className="stat-value" data-parallax="80">{memberStats.divisions}</span><div><span className="mono accent">TECHNICAL DIVISIONS</span><p>One connected<br/>engineering community.</p></div></div>
          <div className="team-line" data-reveal><div><strong>{memberStatsAvailable ? memberDivisions.filter(division => members.some(member => member.role === 'Division Lead' && member.divisionId === division.id)).length : '—'}</strong><span>DIVISION LEADS</span></div></div>
          <div className="year-distribution" data-reveal><div><Label>LEARNING ACROSS YEARS</Label><p>{memberStatsAvailable ? memberStats.divisionMembers : '—'} division members.<br/>Knowledge that moves between cohorts.</p></div><div className="year-chart"><div className="year-key">{memberStatsAvailable ? Object.entries(memberStats.byYear).map(([year, total]) => <span key={year}><b>{total}</b> {year.toUpperCase()}</span>) : <span><b>—</b> YEAR DISTRIBUTION</span>}</div><div className="year-dots" role="img" aria-label={memberStatsAvailable ? Object.entries(memberStats.byYear).map(([year, total]) => `${total} ${year}`).join(', ') : 'Member year distribution unavailable'}>{memberStatsAvailable && members.map(member => <i className={member.year === 'II Year' ? 'year-two' : 'year-three'} key={member.id}/>)}</div></div></div>
        </div>
        <div id="divisions" className="story-beat divisions-beat"><div className="section-wrap"><Label number="06">THE SEVEN DIVISIONS</Label><div className="directory-heading"><h2>Find your discipline.<br/><span className="accent">Expand your perspective.</span></h2><p className="mono">CSR-RIT / DIVISION DIRECTORY<br/><span className="subtle">SELECT A DIVISION TO MEET ITS LEAD</span></p></div><Divisions counts={memberStatsAvailable ? memberStats.byDivision : {}}/></div></div>
      </section>

      <section id="intelligence" className="chapter chapter-intelligence" data-chapter="4" aria-label="Member opportunities, software and intelligence">
        <div className="story-beat intelligence-intro"><div className="section-wrap"><Label number="07">WHAT MEMBERS CAN DO</Label><h2 className="medium-heading" data-reveal>What happens<br/><span className="accent">inside CSR?</span></h2><div className="opportunity-list">{opportunities.map((name, i) => <div data-reveal key={name}><span className="mono">0{i + 1}</span><h3>{name}</h3><span className="opportunity-line"/></div>)}</div></div></div>
        <div className="story-beat digital-beat"><div className="section-wrap"><Label number="08">FROM HARDWARE TO SOFTWARE & AI</Label><h2 className="medium-heading">Engineering doesn’t<br/><span className="accent">end at hardware.</span></h2><div className="digital-keywords mono" data-reveal><span>SOFTWARE.</span><span>DATA.</span><span>AI.</span><span>AUTOMATION.</span></div><DigitalExplorer/></div></div>
        <div className="story-beat belief-beat"><div className="section-wrap"><Label number="09">WHY EXPLORE CSR?</Label><h2 className="belief-words"><span data-reveal>Bring your</span><span data-reveal>questions.</span><span className="accent" data-reveal>Build what</span><span className="accent" data-reveal>comes next.</span></h2><div className="belief-copy" data-reveal><p className="body-copy">Explore a technology. Find collaborators across divisions. Develop a technical portfolio through the things you learn, test and build.</p><p className="body-copy">CSR-RIT connects that journey to a community of students at Rajalakshmi Institute of Technology.</p><p className="campus-caption mono">LEARNING / RESEARCH / COLLABORATION / IMPACT</p></div></div></div>
      </section>
    </div>

    <section className="closing-section"><div className="section-wrap"><Label>TECHNICAL COMMUNITY / RIT CHENNAI</Label><h2 className="closing-title"><span className="closing-title-ink">CSR<span className="accent">—</span>RIT</span></h2><p className="closing-fullname">Community for<br/>Super Intelligence & Robotics</p><p className="closing-institution mono">RAJALAKSHMI INSTITUTE OF TECHNOLOGY</p><div className="closing-bottom"><p className="closing-invitation">Explore what the<br/>community is building.</p><div className="closing-links"><Link to="/announcements">Announcements<span>01 ↗</span></Link><Link to="/projects">Projects<span>02 ↗</span></Link><Link to="/members">Member portfolio<span>03 ↗</span></Link></div></div></div></section>
    <Footer/>
  </main>;
}
