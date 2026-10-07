import { Link } from 'react-router-dom';
import { Footer } from '../components';
import './announcements.css';

export default function AnnouncementsPage() {
  return <div className="announcements-shell">
    <main id="main-content" className="announcements-page" aria-label="CSR-RIT announcements">
      <div className="announcements-wrap">
        <header className="announcements-intro">
          <p className="news-label"><span aria-hidden="true"/>CSR-RIT / ANNOUNCEMENTS</p>
          <h1><span className="news-title-prelude">Latest</span>Announcements<span className="news-title-period">.</span></h1>
          <div className="news-intro-bottom">
            <p className="news-intro-copy">Updates, opportunities, events and important notices from the CSR-RIT community.</p>
            <p className="news-edition"><span>COMMUNITY NOTICEBOARD</span>Rajalakshmi Institute of Technology</p>
          </div>
        </header>

        <section className="announcements-board" aria-labelledby="news-board-title">
          <div className="news-board-heading">
            <h2 id="news-board-title">The noticeboard</h2>
            <span className="news-board-caption">CSR-RIT / COMMUNITY UPDATES</span>
          </div>
          <div className="news-board-layout">
            <div className="news-empty-panel">
              <div className="news-empty-mark" aria-hidden="true">
                <svg viewBox="0 0 48 56" fill="none"><path d="M8 4h24l8 8v40H8V4Z"/><path d="M32 4v8h8M16 23h16M16 31h16M16 39h9"/><path className="news-empty-mark-blue" d="M3 18v29M14 56h24"/></svg>
              </div>
              <div className="news-empty-copy">
                <p className="news-label">PUBLICATION STATUS</p>
                <h3>No announcements yet<span>.</span></h3>
                <p>New updates from CSR-RIT will appear here.</p>
                <Link className="news-text-link" to="/">Explore the CSR story <span aria-hidden="true">↗</span></Link>
              </div>
              <span className="news-panel-corner" aria-hidden="true"/>
            </div>
            <aside className="news-community-note" aria-label="About this noticeboard">
              <p className="news-label">FROM THE COMMUNITY</p>
              <h3>Stay in the loop<span>.</span></h3>
              <p>A shared space for what’s happening across CSR-RIT.</p>
              <div className="news-note-signature"><span aria-hidden="true"/>Student engineering community<br/>RIT, Chennai</div>
            </aside>
          </div>
        </section>
      </div>
    </main>
    <Footer/>
  </div>;
}
