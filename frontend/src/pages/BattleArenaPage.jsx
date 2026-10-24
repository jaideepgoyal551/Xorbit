import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clipboard, Clock3, ExternalLink,
  LoaderCircle, Swords, Trophy, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const hasSolved = (player, slug) =>
  player?.solvedProblems?.some(problem => problem.slug === slug) || false;

const BattleArenaPage = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const userId = user?._id || user?.id;

  const [options, setOptions] = useState({ topics: [], topicOptions: [], difficulties: [], problemCount: 0 });
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [linkedLeetCode, setLinkedLeetCode] = useState(user?.platforms?.leetcode || '');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [battle, setBattle] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [copied, setCopied] = useState(false);

  const refreshBattle = useCallback(async () => {
    if (!battleId) return;
    try {
      setBattle(await api.getBattle(battleId));
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Could not load this battle.');
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.getBattleOptions(), api.getUser()])
      .then(([optionsResult, userResult]) => {
        if (!mounted) return;
        if (optionsResult.status === 'fulfilled') {
          setOptions(optionsResult.value);
        } else {
          setError(optionsResult.reason?.message || 'Could not load battle options.');
        }
        if (userResult.status === 'fulfilled') {
          setLinkedLeetCode(userResult.value?.platforms?.leetcode || '');
        } else if (!user?.platforms?.leetcode) {
          setError(userResult.reason?.message || 'Could not load your linked LeetCode username.');
        }
      })
      .finally(() => {
        if (mounted && !battleId) setLoading(false);
      });
    return () => { mounted = false; };
  }, [battleId, user?.platforms?.leetcode]);

  useEffect(() => {
    if (!battleId) {
      setBattle(null);
      return undefined;
    }
    setLoading(true);
    refreshBattle();
    const poll = window.setInterval(refreshBattle, 15000);
    return () => window.clearInterval(poll);
  }, [battleId, refreshBattle]);

  useEffect(() => {
    if (!socket || !battleId) return undefined;
    const handleUpdate = event => {
      if (event.battleId === battleId) refreshBattle();
    };
    socket.emit('battle:join', battleId);
    socket.on('battle:updated', handleUpdate);
    return () => {
      socket.emit('battle:leave', battleId);
      socket.off('battle:updated', handleUpdate);
    };
  }, [socket, battleId, refreshBattle]);

  useEffect(() => {
    if (!battle?.endsAt || battle.status !== 'active') {
      setRemaining(0);
      return undefined;
    }
    const tick = () => setRemaining(Math.max(
      0,
      Math.ceil((new Date(battle.endsAt).getTime() - Date.now()) / 1000)
    ));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [battle?.endsAt, battle?.status]);

  const ownPlayer = useMemo(
    () => battle?.players.find(player => player.user._id === userId) || null,
    [battle, userId]
  );
  const opponent = useMemo(
    () => battle?.players.find(player => player.user._id !== userId) || null,
    [battle, userId]
  );
  const availableTopics = useMemo(() => {
    const topicsForDifficulty = options.topicOptions
      .filter(option => option.difficulty === difficulty)
      .map(option => option.topic);
    return options.topicOptions.length ? topicsForDifficulty : options.topics;
  }, [difficulty, options]);

  const moveIntoBattle = match => {
    setBattle(match);
    setError('');
    navigate(`/contests/battle/${match._id}`);
  };

  const performAction = async (name, actionRequest) => {
    if (!linkedLeetCode) {
      setError('Link your LeetCode username before starting a battle.');
      return;
    }
    setAction(name);
    setError('');
    try {
      moveIntoBattle(await actionRequest());
    } catch (requestError) {
      setError(requestError.message || 'Could not complete that battle action.');
    } finally {
      setAction('');
    }
  };

  const handleLeaveQueue = async () => {
    setAction('leave');
    try {
      await api.leaveBattleQueue();
      setBattle(null);
      navigate('/contests/battle');
    } catch (requestError) {
      setError(requestError.message || 'Could not leave the queue.');
    } finally {
      setAction('');
    }
  };

  const handleJoinRoom = event => {
    event.preventDefault();
    if (!inviteCodeInput.trim()) return;
    performAction('join', () => api.joinFriendBattle(inviteCodeInput.trim()));
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(battle.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access is unavailable. Copy the room code manually.');
    }
  };

  const isQueueWaiting = battle?.mode === 'quick' && battle.status === 'waiting';
  const isActive = battle?.status === 'active';
  const isCompleted = battle?.status === 'completed';
  const isCancelled = battle?.status === 'cancelled';
  const hasLeetCodeProblems = battle?.problems?.length === 3;
  const winnerId = battle?.winner?._id || battle?.winner;

  return (
    <div className="mx-auto w-full max-w-5xl pb-8 text-white">
      <Link to="/contests" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to contests
      </Link>

      {!battleId ? (
        <section className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/80 via-[#17152b] to-[#10121b] p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200">
              <Swords className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">CodeVerse Arena</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Three LeetCode questions. One head-to-head battle.</h1>
            </div>
          </div>
          <p className="mb-6 max-w-3xl text-sm leading-6 text-gray-300">
            Both players get the same three LeetCode problems and 45 minutes. Solve them on LeetCode;
            each accepted solve is worth 10 points.
          </p>

          {!linkedLeetCode && (
            <div className="mb-6 rounded-lg border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              Link your LeetCode username to let CodeVerse verify accepted submissions.{' '}
              <Link to="/platforms?tab=leetcode" className="font-semibold underline underline-offset-2">
                Link LeetCode
              </Link>
            </div>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-300">
              Topic
              <select
                value={topic}
                onChange={event => setTopic(event.target.value)}
                className="mt-2 w-full rounded-lg border border-indigo-300/15 bg-[#101326] px-3 py-3 text-white outline-none focus:border-indigo-300/50"
              >
                <option value="">Any topic</option>
                {availableTopics.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-300">
              Difficulty
              <select
                value={difficulty}
                onChange={event => {
                  const nextDifficulty = event.target.value;
                  setDifficulty(nextDifficulty);
                  if (!options.topicOptions.some(option => option.topic === topic && option.difficulty === nextDifficulty)) {
                    setTopic('');
                  }
                }}
                className="mt-2 w-full rounded-lg border border-indigo-300/15 bg-[#101326] px-3 py-3 text-white outline-none focus:border-indigo-300/50"
              >
                {(options.difficulties.length ? options.difficulties : ['easy', 'medium', 'hard']).map(item => (
                  <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>

          {options.problemCount === 0 && (
            <p className="mb-5 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
              LeetCode battle questions are not available yet.
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <button
              onClick={() => performAction('queue', () => api.joinBattleQueue({ topic, difficulty }))}
              disabled={loading || action !== '' || options.problemCount === 0 || !linkedLeetCode}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2939e8] to-[#5865f2] px-5 py-4 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'queue' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
              Find a quick match
            </button>
            <button
              onClick={() => performAction('create', () => api.createFriendBattle({ topic, difficulty }))}
              disabled={loading || action !== '' || options.problemCount === 0 || !linkedLeetCode}
              className="flex items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-5 py-4 font-semibold text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'create' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
              Challenge a friend
            </button>
          </div>

          <form onSubmit={handleJoinRoom} className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
            <input
              value={inviteCodeInput}
              onChange={event => setInviteCodeInput(event.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Enter a friend's room code"
              aria-label="Room code"
              className="min-w-0 flex-1 rounded-lg border border-indigo-300/15 bg-[#101326] px-4 py-3 uppercase tracking-widest text-white outline-none placeholder:normal-case placeholder:tracking-normal focus:border-indigo-300/50"
            />
            <button
              type="submit"
              disabled={!inviteCodeInput.trim() || action !== '' || !linkedLeetCode}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
            >
              {action === 'join' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Join room <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : (
        <div>
          {loading && !battle ? (
            <div className="flex min-h-72 items-center justify-center text-indigo-200">
              <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
          ) : battle ? (
            <>
              <section className="mb-5 rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-950/80 via-[#17152b] to-[#10121b] p-5 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200">
                    <Swords className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      {battle.mode === 'friend' ? 'Friend battle' : 'Quick match'}
                    </p>
                    <h1 className="text-xl font-bold">
                      {isQueueWaiting ? 'Finding your opponent…' : isActive ? 'Battle in progress' : isCompleted ? 'Battle complete' : isCancelled ? 'Battle room expired' : 'Waiting for opponent'}
                    </h1>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-0">
                  {battle.inviteCode && (
                    <button onClick={handleCopyInvite} className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/20 bg-white/5 px-3 py-2 text-sm text-indigo-100 hover:bg-white/10">
                      <Clipboard className="h-4 w-4" /> Room {battle.inviteCode} · {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                  {isQueueWaiting && (
                    <button onClick={handleLeaveQueue} disabled={action === 'leave'} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
                      {action === 'leave' ? 'Leaving…' : 'Leave queue'}
                    </button>
                  )}
                  {isActive && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 font-mono text-lg">
                      <Clock3 className="h-4 w-4 text-indigo-300" />
                      {formatTime(remaining)}
                    </div>
                  )}
                </div>
              </section>

              {!hasLeetCodeProblems && (
                <section className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  This battle was created with the previous format and cannot be converted to LeetCode scoring.{' '}
                  <Link to="/contests/battle" className="font-semibold underline underline-offset-2">Start a new battle</Link>.
                </section>
              )}

              {(isQueueWaiting || battle.status === 'waiting') && (
                <section className="mb-5 rounded-2xl border border-indigo-300/15 bg-[#121528] p-6 text-center">
                  <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-300" />
                  <h2 className="font-semibold">{isQueueWaiting ? 'Searching for a matching coder' : 'Share your invite code'}</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {isQueueWaiting
                      ? 'The 45-minute battle starts when another player joins your queue.'
                      : `Your friend can enter room code ${battle.inviteCode} in the Battle Arena.`}
                  </p>
                  {battle.inviteCode && (
                    <button onClick={handleCopyInvite} className="mt-4 rounded-lg bg-indigo-500/15 px-4 py-2 font-mono text-lg tracking-widest text-indigo-100">
                      {battle.inviteCode} · {copied ? 'Copied' : 'Copy code'}
                    </button>
                  )}
                </section>
              )}

              {isCancelled && (
                <section className="mb-5 rounded-2xl border border-indigo-300/15 bg-[#121528] p-8 text-center">
                  <Clock3 className="mx-auto mb-4 h-8 w-8 text-indigo-300" />
                  <h2 className="font-semibold">{hasLeetCodeProblems ? 'This waiting room expired' : 'This old-format battle was cancelled'}</h2>
                  <Link to="/contests/battle" className="mt-4 inline-block rounded-lg bg-indigo-500/20 px-4 py-2 font-semibold text-indigo-100 hover:bg-indigo-500/30">
                    Back to Battle Arena
                  </Link>
                </section>
              )}

              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                {[{ player: ownPlayer, label: 'You' }, { player: opponent, label: 'Opponent' }].map(({ player, label }) => (
                  <section key={label} className="rounded-xl border border-indigo-300/15 bg-[#121528] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{player?.user.fullName || player?.user.username || label}</div>
                      <div className="text-2xl font-bold text-indigo-200">{player?.score || 0}<span className="ml-1 text-xs font-normal text-gray-400">pts</span></div>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {player?.verificationStatus === 'unavailable'
                        ? 'LeetCode verification temporarily unavailable'
                        : player?.verificationStatus === 'verified'
                          ? `${player.solvedProblems.length} of 3 accepted`
                          : player ? 'Waiting for first LeetCode check' : 'Waiting to join'}
                    </p>
                  </section>
                ))}
              </div>

              {battle.players.some(player => player.verificationStatus === 'unavailable') && (
                <p className="mb-5 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                  LeetCode verification is temporarily unavailable. Scores may take longer to update; CodeVerse will retry automatically.
                </p>
              )}

              {isCompleted && hasLeetCodeProblems && (
                <section className="mb-5 rounded-2xl border border-indigo-300/20 bg-gradient-to-r from-indigo-950/70 to-[#101326] p-5">
                  <div className="flex items-center gap-3">
                    {winnerId ? <Trophy className="h-6 w-6 text-indigo-200" /> : <Swords className="h-6 w-6 text-indigo-200" />}
                    <div>
                      <h2 className="font-semibold">
                        {winnerId
                          ? winnerId === userId
                            ? 'You won the battle!'
                            : `${opponent?.user.fullName || opponent?.user.username || 'Your opponent'} won this battle`
                          : 'The battle ended in a draw'}
                      </h2>
                      <p className="text-sm text-gray-400">Each accepted solution is worth 10 points. Equal scores are decided by who reached that score first.</p>
                    </div>
                  </div>
                </section>
              )}

              {hasLeetCodeProblems && <section className="rounded-2xl border border-indigo-300/15 bg-[#111426] p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Battle problems</h2>
                    <p className="text-sm text-gray-400">Open each problem on LeetCode. Accepted submissions during the battle earn points.</p>
                  </div>
                  {isActive && <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200">Live score · 10 pts each</span>}
                </div>
                <div className="space-y-3">
                  {battle.problems.map((problem, index) => (
                    <article key={problem.slug} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-sm font-bold text-indigo-200">{index + 1}</span>
                        <div>
                          <h3 className="font-medium">{problem.title}</h3>
                          <p className="mt-1 text-xs text-gray-400">{problem.topic} · {problem.difficulty}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            <span className={hasSolved(ownPlayer, problem.slug) ? 'text-emerald-300' : 'text-gray-500'}>
                              You: {hasSolved(ownPlayer, problem.slug) ? 'Accepted · +10' : 'Not detected'}
                            </span>
                            <span className={hasSolved(opponent, problem.slug) ? 'text-emerald-300' : 'text-gray-500'}>
                              Opponent: {hasSolved(opponent, problem.slug) ? 'Accepted · +10' : 'Not detected'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={problem.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2939e8] to-[#5865f2] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                      >
                        Solve on LeetCode <ExternalLink className="h-4 w-4" />
                      </a>
                    </article>
                  ))}
                </div>
              </section>}

              {isCompleted && (
                <Link to="/contests/battle" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-500/20 px-4 py-2 font-semibold text-indigo-100 hover:bg-indigo-500/30">
                  <CheckCircle2 className="h-4 w-4" /> Start another battle
                </Link>
              )}
            </>
          ) : null}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default BattleArenaPage;
