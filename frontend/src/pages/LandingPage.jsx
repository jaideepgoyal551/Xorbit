import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, BarChart3, BookOpen, Code2, Trophy } from 'lucide-react';
import Logo from '../components/common/Logo';

const LandingPage = () => {
  const platforms = ['LeetCode', 'Codeforces', 'CodeChef', 'GeeksforGeeks'];

  return (
    <div className="cv-public-page min-h-screen text-white">
      <header className="cv-public-header">
        <Link to="/" className="cv-public-brand" aria-label="Xorbits home">
          <span className="cv-public-logo"><Logo className="h-full w-full" /></span>
          <span>Xorbits</span>
        </Link>

        <nav className="cv-public-nav" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#practice">Practice</a>
          <a href="#platforms">Platforms</a>
          <a href="#about">About</a>
        </nav>

        <div className="cv-public-actions">
          <Link to="/login" className="cv-public-signin">Sign In</Link>
          <Link to="/register" className="cv-public-signup">Sign Up for Free</Link>
        </div>
      </header>

      <main>
        <section id="product" className="cv-public-hero">
          <div className="cv-public-glow" aria-hidden="true" />
          <div className="cv-public-hero-content">
            <p className="cv-public-eyebrow"><span /> Your competitive programming workspace</p>
            <h1>Build skills.<br />Break <span>limits.</span></h1>
            <p className="cv-public-description">
              One home for your coding practice, platform stats, and upcoming contests.
              Make every problem count.
            </p>

            <div className="cv-public-hero-actions">
              <Link to="/register" className="cv-public-primary">
                Start practicing <ArrowRight size={17} />
              </Link>
              <Link to="/login" className="cv-public-secondary">
                Sign in to Xorbits
              </Link>
            </div>

            <div className="cv-public-platforms" id="platforms">
              <span>ONE PROFILE. ALL YOUR PLATFORMS.</span>
              <div>{platforms.map(platform => <span key={platform}>{platform}</span>)}</div>
            </div>
          </div>

          <div className="cv-public-install" aria-label="Xorbits features">
            <span className="cv-public-install-icon"><Code2 size={18} /></span>
            <span className="cv-public-install-label">YOUR CODING COMMAND CENTER</span>
            <span className="cv-public-install-detail">Practice <b>·</b> Track <b>·</b> Compete</span>
          </div>

          <a className="cv-public-scroll" href="#practice" aria-label="Scroll to explore">
            <ArrowDown size={16} />
          </a>
        </section>

        <section id="practice" className="cv-public-preview-wrap">
          <div className="cv-public-preview">
            <div className="cv-preview-sidebar">
              <div className="cv-preview-brand"><span className="cv-preview-brand-mark">&lt;/&gt;</span> Xorbits</div>
              <span className="cv-preview-label">YOUR WORKSPACE</span>
              <span className="cv-preview-nav active"><BarChart3 size={15} /> Overview</span>
              <span className="cv-preview-nav"><BookOpen size={15} /> Practice sheets</span>
              <span className="cv-preview-nav"><Trophy size={15} /> Contests</span>
            </div>

            <div className="cv-preview-main">
              <div className="cv-preview-topline">
                <div>
                  <span className="cv-preview-label">YOUR CODING JOURNEY</span>
                  <h2>Progress, in one place.</h2>
                </div>
                <span className="cv-preview-avatar">CV</span>
              </div>

              <div className="cv-preview-stat-grid">
                <div className="cv-preview-stat"><span>Problems solved</span><strong>Track your growth</strong><i className="cv-preview-chart chart-a" /></div>
                <div className="cv-preview-stat"><span>Platforms connected</span><strong>All in sync</strong><i className="cv-preview-chart chart-b" /></div>
                <div className="cv-preview-stat"><span>Contest activity</span><strong>Stay in the race</strong><i className="cv-preview-chart chart-c" /></div>
              </div>

              <div className="cv-preview-bottom">
                <div className="cv-preview-activity">
                  <span className="cv-preview-label">KEEP YOUR MOMENTUM</span>
                  <div className="cv-preview-heatmap">{Array.from({ length: 56 }, (_, index) => <i key={index} className={`heat-${(index * 7 + 3) % 5}`} />)}</div>
                </div>
                <div className="cv-preview-up-next">
                  <span className="cv-preview-label">UP NEXT</span>
                  <strong>Find your next challenge</strong>
                  <span>Explore curated DSA sheets <ArrowRight size={13} /></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="cv-public-footer">
          <div>
            <span className="cv-public-eyebrow"><span /> MADE FOR YOUR NEXT BREAKTHROUGH</span>
            <h2>Make your next hour<br />of practice count.</h2>
          </div>
          <Link to="/register" className="cv-public-primary">Create your free account <ArrowRight size={17} /></Link>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
