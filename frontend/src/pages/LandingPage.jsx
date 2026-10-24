import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Calendar, Users, TrendingUp, Zap, ArrowRight, Code2 } from 'lucide-react';
import Logo from '../components/common/Logo';

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const statItems = [
    { value: '4', label: 'platforms', icon: Code2 },
    { value: '12.8K', label: 'problems', icon: BarChart3 },
    { value: 'Live', label: 'contest tracking', icon: Zap },
    { value: 'One', label: 'unified profile', icon: Users }
  ];

  const features = [
    {
      icon: BarChart3,
      title: 'Unified analytics',
      description: 'Combine your stats from Codeforces, LeetCode, CodeChef and AtCoder in one place with beautiful visualizations.'
    },
    {
      icon: TrendingUp,
      title: 'Smart problem discovery',
      description: 'Find problems based on your rating, topics, difficulty and solve history without wasting time.'
    },
    {
      icon: Calendar,
      title: 'Contest radar',
      description: 'Never miss a contest again. Get upcoming contests, live tracking and personalized reminders.'
    }
  ];

  return (
    <div className="landing-page-shell min-h-screen text-white">
      <div className="landing-bg" aria-hidden="true" />

      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/10 bg-[#050a13]/80 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'}`}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center">
              <Logo className="h-full w-full" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">CodeVerse</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#platforms" className="transition hover:text-white">Platforms</a>
            <a href="#leaderboard" className="transition hover:text-white">Leaderboard</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400/50 hover:text-white">
              Sign in
            </Link>
            <Link to="/register" className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_30px_rgba(59,88,255,0.35)] transition hover:scale-[1.02]">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 lg:pt-32">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 shadow-[0_0_25px_rgba(88,101,242,0.18)]">
              All your competitive programming in one place
            </div>

            <h1 className="max-w-xl text-5xl font-black leading-[0.96] tracking-[-0.06em] text-white sm:text-6xl lg:text-[5rem]">
              Your coding journey,<br />
              <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-blue-200 bg-clip-text text-transparent">unified.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Track progress. Discover problems. Stay ahead of every contest. CodeVerse brings together problems, contests and statistics from Codeforces, LeetCode, CodeChef and AtCoder so you can focus on what matters.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-500 px-6 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(59,88,255,0.35)] transition hover:scale-[1.02]">
                Explore Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:border-indigo-400/40 hover:bg-indigo-500/5">
                <BarChart3 className="h-4 w-4" /> View Demo
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center">
            <div className="hero-orbit" aria-hidden="true">
              <div className="pulse-ring pulse-ring-1" />
              <div className="pulse-ring pulse-ring-2" />
              <div className="pulse-ring pulse-ring-3" />
            </div>

            <div className="orbital-panel">
              <div className="platform-chip platform-chip-left">
                <span className="platform-dot codeforces" />
                Codeforces
              </div>
              <div className="platform-chip platform-chip-right">
                <span className="platform-dot leetcode" />
                LeetCode
              </div>
              <div className="platform-chip platform-chip-bottom left">
                <span className="platform-dot codechef" />
                CodeChef
              </div>
              <div className="platform-chip platform-chip-bottom right">
                <span className="platform-dot atcoder" />
                AtCoder
              </div>

              <div className="code-square">
                <div className="code-square-inner">
                  <span className="slash-left" />
                  <span className="slash-right" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-[26px] border border-white/10 bg-slate-900/50 shadow-[0_0_35px_rgba(15,23,42,0.7)] backdrop-blur-xl">
          <div className="grid gap-4 md:grid-cols-4">
            {statItems.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4 border-r border-white/5 px-6 py-5 last:border-r-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-sm text-slate-300">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">Features</p>
            <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              Everything you need to <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">level up</span>
            </h2>
            <p className="mt-5 text-lg text-slate-300">
              Powerful tools, beautiful insights and a unified experience for competitive programmers.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="feature-card rounded-[24px] border border-white/10 bg-slate-900/40 p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-white">{title}</h3>
                <p className="text-base leading-7 text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
