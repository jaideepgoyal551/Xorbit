import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight,
  Clock3, Code2, Copy, ExternalLink, Lightbulb, ListChecks, Search,
  Sparkles, Target, TriangleAlert
} from 'lucide-react';
import topicGuides from '../data/dsaGuideContent';

const LANGUAGE_TABS = [
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' }
];

const STORAGE_KEY = 'codeverse:dsa-guide-progress:v1';

const readProgress = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
};

const slugify = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const makeProblemHint = (problem, topic) => {
  const title = problem.name.toLowerCase();
  const tailoredHints = [
    [/two sum(?! ii)/, 'Look for a complement: what value would complete the target, and have you already seen it?'],
    [/group anagrams/, 'Choose a canonical signature so words with the same character counts land in the same bucket.'],
    [/top k frequent/, 'Separate counting from selection; decide whether a bounded heap or bucket ordering fits the constraints.'],
    [/product of array except self/, 'Build products on each side of an index so division is not needed.'],
    [/longest consecutive/, 'Start a run only where its predecessor is absent, then count forward once.'],
    [/two sum ii/, 'Use sorted order: compare the endpoint sum and discard the side that cannot reach the target.'],
    [/3sum/, 'Sort, fix one value, then use two pointers; skip duplicates at each decision level.'],
    [/container with most water/, 'The shorter wall limits the area, so move that side inward after recording the current area.'],
    [/trapping rain water/, 'Water at an index is limited by the smaller boundary; maintain side maxima or precompute them.'],
    [/valid parentheses/, 'A closing bracket must match the most recent unmatched opening bracket.'],
    [/daily temperatures/, 'Keep unresolved indices in a decreasing stack and resolve them when a warmer value arrives.'],
    [/largest rectangle/, 'For each height, find the widest span where it is the minimum; monotonic boundaries reveal that span.'],
    [/search in rotated/, 'At least one half remains sorted; identify it, then test whether the target belongs to that half.'],
    [/koko/, 'Binary-search the speed and write a monotonic feasibility check for the allowed time.'],
    [/longest substring/, 'Maintain a duplicate-free window and jump its left edge past the previous occurrence.'],
    [/minimum window/, 'Track how many required character counts are currently satisfied, then shrink a valid window.'],
    [/reverse linked list/, 'Save the next link before redirecting the current node toward the previous node.'],
    [/linked list cycle/, 'Move slow by one and fast by two; a cycle forces them to meet.'],
    [/lru cache/, 'Combine a hash map for lookup with a doubly linked list for constant-time recency updates.'],
    [/merge k sorted/, 'Keep one current head per list in a min-heap and add that list’s next node after removal.'],
    [/level order/, 'Use BFS and capture the queue length before processing each level.'],
    [/validate binary search/, 'Carry strict lower and upper bounds down the tree, not just parent comparisons.'],
    [/lowest common ancestor/, 'Use the BST ordering to move toward the split point where the targets diverge.'],
    [/number of islands/, 'Each unvisited land cell starts a component; flood-fill it and mark cells when enqueued.'],
    [/course schedule/, 'Model prerequisites as directed edges and remove zero-indegree nodes; all courses removed means no cycle.'],
    [/climbing stairs/, 'Define ways to reach step i from the one or two immediately previous steps.'],
    [/coin change/, 'For each amount, consider taking each usable coin and keep the smallest reachable count.'],
    [/longest common subsequence/, 'Compare prefixes of both strings; equal characters extend the diagonal state.'],
    [/jump game/, 'Maintain the farthest reachable index and fail as soon as the scan passes it.'],
    [/merge intervals/, 'Sort by start; either extend the last merged range or begin a new one.'],
    [/rotate image/, 'For a square matrix, transpose and reverse each row to rotate clockwise in place.'],
    [/number of 1 bits/, 'Repeatedly clear the least significant set bit with n & (n - 1).'],
    [/implement trie/, 'Create one child edge per character and mark terminal nodes separately from prefixes.']
  ];
  const match = tailoredHints.find(([pattern]) => pattern.test(title));
  return match?.[1] || `Start by stating the input invariant. Then apply the ${topic} pattern and explain why each step preserves correctness.`;
};

const DsaGuidePage = () => {
  const [problemSets, setProblemSets] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [language, setLanguage] = useState('cpp');
  const [expandedProblem, setExpandedProblem] = useState('');
  const [progress, setProgress] = useState(readProgress);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    import('../data/sheetsData')
      .then(module => {
        if (!active) return;
        setProblemSets(module.neetcode150Problems);
        setSelectedTopic(Object.keys(module.neetcode150Problems)[0] || '');
      })
      .catch(error => {
        console.error('Could not load the DSA guide problem list:', error);
        if (active) setLoadError('The study guide questions could not be loaded. Please refresh and try again.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const topicNames = useMemo(() => Object.keys(problemSets || {}), [problemSets]);
  const allProblems = useMemo(
    () => Object.entries(problemSets || {}).flatMap(([topic, problems]) =>
      problems.map((problem, index) => ({
        ...problem,
        topic,
        key: `${slugify(topic)}:${index}:${slugify(problem.name)}`
      }))
    ),
    [problemSets]
  );
  const solvedCount = useMemo(
    () => allProblems.filter(problem => progress[problem.key]).length,
    [allProblems, progress]
  );
  const selectedProblems = problemSets?.[selectedTopic] || [];
  const guide = topicGuides[selectedTopic];
  const visibleProblems = selectedProblems
    .map((problem, index) => ({ ...problem, index, key: `${slugify(selectedTopic)}:${index}:${slugify(problem.name)}` }))
    .filter(problem => difficultyFilter === 'All' || problem.difficulty === difficultyFilter)
    .filter(problem => !search || `${problem.name} ${selectedTopic}`.toLowerCase().includes(search.toLowerCase()));
  const selectedDoneCount = selectedProblems
    .filter((_, index) => progress[`${slugify(selectedTopic)}:${index}:${slugify(selectedProblems[index].name)}`])
    .length;

  const setProblemDone = key => {
    setProgress(current => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const copyExample = async () => {
    const code = guide?.example?.[language];
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error('Could not copy the DSA example:', error);
      setCopied(false);
    }
  };

  if (!problemSets && !loadError) {
    return (
      <div className="mx-auto flex min-h-72 max-w-6xl items-center justify-center text-indigo-200">
        <BookOpen className="mr-3 h-5 w-5 animate-pulse" /> Loading your DSA study guide…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl pb-10 text-white">
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-indigo-300/15 bg-gradient-to-br from-[#171b47] via-[#11152d] to-[#0b1020] p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-14 -top-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative">
          <Link to="/sheets" className="mb-5 inline-flex items-center gap-2 text-sm text-indigo-200/80 transition hover:text-white">
            <ArrowUpRight className="h-4 w-4 rotate-[-45deg]" /> DSA Sheets
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200/15 bg-indigo-300/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                <Sparkles className="h-3.5 w-3.5" /> CODEVERSE LEARNING PATH
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">DSA Pattern Playbook</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Learn the idea first, recognize when it applies, then practice with 150 linked interview problems.
                Each pattern includes original notes and examples in C++, Java, and Python.
              </p>
            </div>
            <div className="min-w-48 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Overall practice</span><span>{solvedCount} / {allProblems.length}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all" style={{ width: `${allProblems.length ? (solvedCount / allProblems.length) * 100 : 0}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">Progress saved on this device</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">18 patterns</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{allProblems.length || 150} practice questions</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">3 language examples</span>
          </div>
        </div>
      </section>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{loadError}</div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24">
            <div className="rounded-2xl border border-white/10 bg-[#111426]/90 p-3">
              <div className="px-3 pb-3 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Study roadmap</p>
              </div>
              <nav aria-label="DSA patterns" className="grid max-h-[65vh] grid-cols-2 gap-1 overflow-y-auto pr-1 xl:grid-cols-1">
                {topicNames.map((topic, index) => {
                  const active = selectedTopic === topic;
                  return (
                    <button
                      key={topic}
                      onClick={() => { setSelectedTopic(topic); setExpandedProblem(''); }}
                      className={`flex min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition sm:text-sm ${
                        active ? 'bg-indigo-500/15 text-indigo-100 ring-1 ring-inset ring-indigo-300/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${active ? 'bg-indigo-400/20 text-indigo-100' : 'bg-white/5 text-slate-500'}`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{topic}</span>
                      <span className="text-[10px] text-slate-500">{problemSets[topic].length}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="mt-3 border-t border-white/10 px-3 pt-3">
                <a href="https://neetcode.io/practice" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-indigo-200">
                  Open the original practice list <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            {guide ? (
              <>
                <section className="rounded-2xl border border-indigo-300/15 bg-[#111426] p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
                        <BookOpen className="h-4 w-4" /> Pattern fundamentals
                      </div>
                      <h2 className="text-2xl font-bold">{selectedTopic}</h2>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
                      <div className="text-lg font-bold text-white">{selectedDoneCount}<span className="text-sm text-slate-500">/{selectedProblems.length}</span></div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">marked done</div>
                    </div>
                  </div>
                  <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">{guide.intro}</p>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-sky-300/10 bg-sky-400/[0.04] p-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-200"><Target className="h-4 w-4" /> When to recognize it</h3>
                      <ul className="mt-3 space-y-2.5">
                        {guide.cues.map(cue => <li key={cue} className="flex gap-2 text-sm leading-6 text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />{cue}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-indigo-300/10 bg-indigo-400/[0.04] p-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-200"><ListChecks className="h-4 w-4" /> A reliable workflow</h3>
                      <ol className="mt-3 space-y-2.5">
                        {guide.steps.map((step, index) => (
                          <li key={step} className="flex gap-2.5 text-sm leading-6 text-slate-300">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-400/15 text-[10px] font-bold text-indigo-200">{index + 1}</span>{step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-100"><TriangleAlert className="h-4 w-4" /> Common edge cases</h3>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {guide.pitfalls.map(pitfall => <li key={pitfall} className="flex gap-2 text-sm leading-6 text-slate-300"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-300" />{pitfall}</li>)}
                    </ul>
                  </div>
                </section>

                {guide.example && (
                  <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1020]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold"><Code2 className="h-4 w-4 text-indigo-300" /> Pattern example: {guide.example.problem}</div>
                        <p className="mt-1 text-xs text-slate-400">{guide.example.complexity}</p>
                      </div>
                      <button onClick={copyExample} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy code'}
                      </button>
                    </div>
                    <div className="flex gap-1 border-b border-white/10 px-4 pt-2">
                      {LANGUAGE_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setLanguage(tab.id)} className={`border-b-2 px-3 py-2 text-xs font-medium transition ${language === tab.id ? 'border-indigo-400 text-indigo-200' : 'border-transparent text-slate-500 hover:text-slate-200'}`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <pre className="max-h-[480px] overflow-auto p-4 text-xs leading-6 text-sky-100 sm:p-5 sm:text-[13px]"><code>{guide.example[language]}</code></pre>
                    <p className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">
                      Representative pattern implementation with standard LeetCode function signatures. Tree and linked-list snippets assume the platform-provided node types; adapt signatures to the problem.
                    </p>
                  </section>
                )}

                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111426]">
                  <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                      <div className="flex items-center gap-2 text-lg font-bold"><Lightbulb className="h-5 w-5 text-indigo-300" /> Practice this pattern</div>
                      <p className="mt-1 text-xs text-slate-400">Problem titles and links are listed for practice; CodeVerse notes below are independently written.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a question" aria-label="Search questions" className="w-full rounded-lg border border-white/10 bg-[#0c0f1d] py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-300/40 sm:w-48" />
                      </label>
                      <select value={difficultyFilter} onChange={event => setDifficultyFilter(event.target.value)} aria-label="Filter by difficulty" className="rounded-lg border border-white/10 bg-[#0c0f1d] px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-300/40">
                        {['All', 'Easy', 'Medium', 'Hard'].map(value => <option key={value}>{value}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {visibleProblems.map(problem => {
                      const expanded = expandedProblem === problem.key;
                      const done = Boolean(progress[problem.key]);
                      const difficultyColor = problem.difficulty === 'Easy'
                        ? 'text-emerald-300 bg-emerald-400/10'
                        : problem.difficulty === 'Hard'
                          ? 'text-rose-300 bg-rose-400/10'
                          : 'text-amber-200 bg-amber-300/10';
                      return (
                        <article key={problem.key} className={expanded ? 'bg-white/[0.025]' : ''}>
                          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                            <button
                              onClick={() => setProblemDone(problem.key)}
                              aria-label={done ? `Mark ${problem.name} as not done` : `Mark ${problem.name} as done`}
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${done ? 'border-emerald-300 bg-emerald-400/15 text-emerald-200' : 'border-slate-600 text-transparent hover:border-indigo-300'}`}
                            >
                              {done ? <Check className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                            <button onClick={() => setExpandedProblem(expanded ? '' : problem.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{problem.name}</span>
                              <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${difficultyColor}`}>{problem.difficulty}</span>
                              {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-indigo-300" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                            </button>
                            <a href={problem.link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${problem.name} on LeetCode`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs text-slate-300 transition hover:border-indigo-300/25 hover:bg-indigo-500/10 hover:text-indigo-100">
                              Solve <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          {expanded && (
                            <div className="border-t border-white/[0.06] bg-black/10 px-4 py-4 sm:px-14">
                              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-200">
                                <Lightbulb className="h-3.5 w-3.5" /> How to approach it
                              </div>
                              <p className="text-sm leading-6 text-slate-300">{makeProblemHint(problem, selectedTopic)}</p>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Think it through</p>
                                  <p className="mt-1.5 text-xs leading-5 text-slate-300">{guide.steps[0]} {guide.steps[1]}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pattern to review</p>
                                  <p className="mt-1.5 text-xs leading-5 text-slate-300">{guide.cues[0]}</p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Try it before opening hints or solutions elsewhere.</span>
                                <button onClick={() => setProblemDone(problem.key)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${done ? 'bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15' : 'bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25'}`}>
                                  {done ? 'Completed' : 'Mark complete'}
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {visibleProblems.length === 0 && (
                      <div className="p-10 text-center">
                        <Search className="mx-auto h-6 w-6 text-slate-600" />
                        <p className="mt-3 text-sm font-medium text-slate-300">No questions match these filters.</p>
                        <button onClick={() => { setSearch(''); setDifficultyFilter('All'); }} className="mt-2 text-xs text-indigo-300 hover:text-indigo-200">Clear filters</button>
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-6">
                <h2 className="font-semibold text-amber-100">{selectedTopic}</h2>
                <p className="mt-2 text-sm text-slate-300">This pattern guide is being prepared. You can still browse its linked practice problems below.</p>
                <div className="mt-4 space-y-2">
                  {selectedProblems.map(problem => <a key={problem.link} href={problem.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm text-slate-200 hover:bg-white/5">{problem.name}<ExternalLink className="h-4 w-4" /></a>)}
                </div>
              </section>
            )}
            <p className="px-1 text-xs leading-5 text-slate-600">
              CodeVerse is independent and is not affiliated with NeetCode or LeetCode. Problem names and links are provided for study navigation; theory, notes, and code examples on this page are original CodeVerse material.
            </p>
          </main>
        </div>
      )}
    </div>
  );
};

export default DsaGuidePage;
