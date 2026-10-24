import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clipboard, Clock3, Code2,
  LoaderCircle, Play, Swords, Trophy, Users, XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const LANGUAGES = {
  cpp20: 'C++ 20',
  c: 'C',
  java: 'Java',
  python3: 'Python 3',
  pypy3: 'PyPy 3'
};

const STARTER_CODE = {
  cpp20: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    // Write your solution here\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    // Write your solution here\n    return 0;\n}\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n',
  python3: '# Write your solution here\n',
  pypy3: '# Write your solution here\n'
};

const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const BattleArenaPage = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const userId = user?._id || user?.id;

  const [options, setOptions] = useState({ topics: [], difficulties: [], problemCount: 0 });
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [battle, setBattle] = useState(null);
  const [code, setCode] = useState(STARTER_CODE.cpp20);
  const [language, setLanguage] = useState('cpp20');
  const [remaining, setRemaining] = useState(0);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState('waiting');
  const [output, setOutput] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [copied, setCopied] = useState(false);

  const refreshBattle = useCallback(async () => {
    if (!battleId) return;
    try {
      const data = await api.getBattle(battleId);
      setBattle(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Could not load this battle.');
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    let mounted = true;
    api.getBattleOptions()
      .then(data => {
        if (mounted) setOptions(data);
      })
      .catch(requestError => {
        if (mounted) setError(requestError.message || 'Could not load battle options.');
      })
      .finally(() => {
        if (mounted && !battleId) setLoading(false);
      });
    return () => { mounted = false; };
  }, [battleId]);

  useEffect(() => {
    if (!battleId) {
      setBattle(null);
      return undefined;
    }
    setLoading(true);
    refreshBattle();
    const poll = window.setInterval(refreshBattle, 3000);
    return () => window.clearInterval(poll);
  }, [battleId, refreshBattle]);

  useEffect(() => {
    if (!socket || !battleId) return undefined;

    const handleUpdate = event => {
      if (event.battleId === battleId) refreshBattle();
    };
    const handlePresence = event => {
      if (event.userId !== userId) setOpponentOnline(event.online);
    };
    const handleProgress = event => {
      if (event.userId !== userId) setOpponentProgress(event.status);
    };
    const handleSocketError = event => setError(event.message || 'Could not connect to battle updates.');

    socket.emit('battle:join', battleId);
    socket.on('battle:updated', handleUpdate);
    socket.on('battle:presence', handlePresence);
    socket.on('battle:opponent-progress', handleProgress);
    socket.on('battle:error', handleSocketError);

    return () => {
      socket.emit('battle:leave', battleId);
      socket.off('battle:updated', handleUpdate);
      socket.off('battle:presence', handlePresence);
      socket.off('battle:opponent-progress', handleProgress);
      socket.off('battle:error', handleSocketError);
    };
  }, [socket, battleId, userId, refreshBattle]);

  useEffect(() => {
    if (!battle?.endsAt || battle.status !== 'active') {
      setRemaining(0);
      return undefined;
    }
    const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(battle.endsAt).getTime() - Date.now()) / 1000)));
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

  useEffect(() => {
    if (ownPlayer?.code) {
      setCode(ownPlayer.code);
      if (LANGUAGES[ownPlayer.language]) setLanguage(ownPlayer.language);
    }
  }, [ownPlayer?.code, ownPlayer?.language]);

  useEffect(() => {
    if (!opponent) {
      setOpponentOnline(false);
      setOpponentProgress('waiting');
    }
  }, [opponent]);

  const moveIntoBattle = match => {
    setBattle(match);
    setOutput(null);
    setError('');
    navigate(`/contests/battle/${match._id}`);
  };

  const handleQueue = async () => {
    setAction('queue');
    setError('');
    try {
      moveIntoBattle(await api.joinBattleQueue({ topic, difficulty }));
    } catch (requestError) {
      setError(requestError.message || 'Could not join matchmaking.');
    } finally {
      setAction('');
    }
  };

  const handleLeaveQueue = async () => {
    setAction('leave');
    try {
      await api.leaveBattleQueue();
      setBattle(null);
      setOutput(null);
      navigate('/contests/battle');
    } catch (requestError) {
      setError(requestError.message || 'Could not leave the queue.');
    } finally {
      setAction('');
    }
  };

  const handleCreateRoom = async () => {
    setAction('create');
    setError('');
    try {
      moveIntoBattle(await api.createFriendBattle({ topic, difficulty }));
    } catch (requestError) {
      setError(requestError.message || 'Could not create a room.');
    } finally {
      setAction('');
    }
  };

  const handleJoinRoom = async event => {
    event.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setAction('join');
    setError('');
    try {
      moveIntoBattle(await api.joinFriendBattle(inviteCodeInput.trim()));
    } catch (requestError) {
      setError(requestError.message || 'Could not join that room.');
    } finally {
      setAction('');
    }
  };

  const handleRun = async () => {
    if (!battleId || !code.trim()) return;
    setAction('run');
    setOutput({ status: 'running' });
    socket?.emit('battle:progress', { battleId, status: 'running' });
    try {
      setOutput(await api.runBattleCode(battleId, code, language));
    } catch (requestError) {
      setOutput({ error: requestError.message || 'Could not run the sample tests.' });
    } finally {
      setAction('');
      socket?.emit('battle:progress', { battleId, status: 'coding' });
    }
  };

  const handleSubmit = async () => {
    if (!battleId || !code.trim()) return;
    setAction('submit');
    setOutput({ status: 'running' });
    socket?.emit('battle:progress', { battleId, status: 'submitted' });
    try {
      const result = await api.submitBattleCode(battleId, code, language);
      setBattle(result.battle);
      setOutput({ ...result.submission, status: result.submission.verdict });
    } catch (requestError) {
      setOutput({ error: requestError.message || 'Could not submit your solution.' });
      socket?.emit('battle:progress', { battleId, status: 'coding' });
    } finally {
      setAction('');
    }
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
  const allowedLanguages = battle?.problem?.allowedLanguages?.length
    ? Object.keys(LANGUAGES).filter(item => battle.problem.allowedLanguages.includes(item))
    : Object.keys(LANGUAGES);
  const winnerId = battle?.winner?._id || battle?.winner;

  return (
    <div className="mx-auto w-full max-w-6xl pb-8 text-white">
      <Link to="/contests" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to contests
      </Link>

      {!battleId ? (
        <section className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/80 via-[#17152b] to-[#10121b] p-6 sm:p-8">
          <div className="mb-7 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200">
              <Swords className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">CodeVerse Arena</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Challenge a coder. Solve head-to-head.</h1>
            </div>
          </div>
          <p className="mb-7 max-w-2xl text-sm leading-6 text-gray-300">
            Get the same problem and 15-minute clock. The winner is decided by hidden-test cases passed, then execution time and memory.
          </p>

          <div className="mb-7 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-300">
              Topic
              <select
                value={topic}
                onChange={event => setTopic(event.target.value)}
                className="mt-2 w-full rounded-lg border border-indigo-300/15 bg-[#101326] px-3 py-3 text-white outline-none focus:border-indigo-300/50"
              >
                <option value="">Any topic</option>
                {options.topics.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-300">
              Difficulty
              <select
                value={difficulty}
                onChange={event => setDifficulty(event.target.value)}
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
              Battle problems are not available yet. Publish a public problem with judge test cases first.
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <button
              onClick={handleQueue}
              disabled={loading || action !== '' || options.problemCount === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2939e8] to-[#5865f2] px-5 py-4 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'queue' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
              Find a quick match
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={loading || action !== '' || options.problemCount === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-5 py-4 font-semibold text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Users className="h-5 w-5" /> Challenge a friend
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
              disabled={!inviteCodeInput.trim() || action !== ''}
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
                  {(isActive || isQueueWaiting || battle.status === 'waiting') && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 font-mono text-lg">
                      <Clock3 className="h-4 w-4 text-indigo-300" />
                      {isActive ? formatTime(remaining) : '15:00'}
                    </div>
                  )}
                </div>
              </section>

              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <PlayerCard player={ownPlayer} label="You" online status={ownPlayer?.status === 'submitted' ? 'Submitted' : 'Coding'} />
                <PlayerCard
                  player={opponent}
                  label="Opponent"
                  online={opponent ? opponentOnline : false}
                  status={opponent ? (!opponentOnline ? 'Offline' : opponentProgress === 'running' ? 'Running code' : opponent.status === 'submitted' ? 'Submitted' : opponentProgress === 'coding' ? 'Coding' : 'Connected') : 'Waiting to join'}
                />
              </div>

              {isQueueWaiting || battle.status === 'waiting' ? (
                <section className="rounded-2xl border border-indigo-300/15 bg-[#121528] p-8 text-center">
                  <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-indigo-300" />
                  <h2 className="text-lg font-semibold text-white">
                    {isQueueWaiting ? 'Searching for a matching coder' : 'Share your invite code'}
                  </h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {isQueueWaiting
                      ? 'This page will start the battle automatically when a player joins your queue.'
                      : `Your friend can enter room code ${battle.inviteCode} in the Battle Arena.`}
                  </p>
                  {battle.inviteCode && (
                    <button onClick={handleCopyInvite} className="mt-4 rounded-lg bg-indigo-500/15 px-4 py-2 font-mono text-lg tracking-widest text-indigo-100">
                      {battle.inviteCode} · {copied ? 'Copied' : 'Copy code'}
                    </button>
                  )}
                </section>
              ) : isCancelled ? (
                <section className="rounded-2xl border border-indigo-300/15 bg-[#121528] p-8 text-center">
                  <Clock3 className="mx-auto mb-4 h-8 w-8 text-indigo-300" />
                  <h2 className="text-lg font-semibold text-white">This waiting room expired</h2>
                  <p className="mt-2 text-sm text-gray-400">Start a new quick match or create a fresh friend room.</p>
                  <button onClick={() => navigate('/contests/battle')} className="mt-4 rounded-lg bg-indigo-500/20 px-4 py-2 font-semibold text-indigo-100 hover:bg-indigo-500/30">
                    Back to Battle Arena
                  </button>
                </section>
              ) : (
                <>
                  {isCompleted && (
                    <section className="mb-5 rounded-2xl border border-indigo-300/20 bg-gradient-to-r from-indigo-950/70 to-[#101326] p-5">
                      <div className="flex items-center gap-3">
                        {winnerId ? <Trophy className="h-6 w-6 text-indigo-200" /> : <Swords className="h-6 w-6 text-indigo-200" />}
                        <div>
                          <h2 className="font-semibold text-white">
                            {winnerId ? (winnerId === userId ? 'You won the battle!' : `${opponent?.user.fullName || opponent?.user.username || 'Your opponent'} won this battle`) : 'The battle ended in a draw'}
                          </h2>
                          <p className="text-sm text-gray-400">Results use hidden tests passed, then execution time and memory.</p>
                        </div>
                      </div>
                    </section>
                  )}

                  <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <ProblemPanel problem={battle.problem} />
                    <section className="overflow-hidden rounded-2xl border border-indigo-300/15 bg-[#111426]">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-white"><Code2 className="h-4 w-4 text-indigo-300" /> Your code</div>
                        <select
                          value={language}
                          onChange={event => {
                            setLanguage(event.target.value);
                            setCode(STARTER_CODE[event.target.value]);
                          }}
                          disabled={!isActive || ownPlayer?.status === 'submitted'}
                          className="rounded-md border border-white/10 bg-[#0b0d18] px-3 py-2 text-sm text-white outline-none focus:border-indigo-300/50"
                        >
                          {allowedLanguages.map(item => <option key={item} value={item}>{LANGUAGES[item]}</option>)}
                        </select>
                      </div>
                      <textarea
                        value={code}
                        onChange={event => {
                          setCode(event.target.value);
                          socket?.emit('battle:progress', { battleId, status: 'coding' });
                        }}
                        disabled={!isActive || ownPlayer?.status === 'submitted'}
                        spellCheck="false"
                        aria-label="Code editor"
                        className="min-h-[360px] w-full resize-y bg-[#0b0d18] p-4 font-mono text-sm leading-6 text-indigo-50 outline-none disabled:opacity-70"
                      />
                      <div className="flex flex-wrap gap-3 border-t border-white/10 p-4">
                        <button onClick={handleRun} disabled={!isActive || !!action || ownPlayer?.status === 'submitted'} className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/20 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-100 hover:bg-indigo-500/20 disabled:opacity-45">
                          {action === 'run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          Run samples
                        </button>
                        <button onClick={handleSubmit} disabled={!isActive || !!action || ownPlayer?.status === 'submitted'} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2939e8] to-[#5865f2] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-45">
                          {action === 'submit' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Submit solution
                        </button>
                      </div>
                      {output && <SubmissionOutput output={output} />}
                    </section>
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
};

const PlayerCard = ({ player, label, online, status }) => (
  <section className="flex items-center justify-between gap-3 rounded-xl border border-indigo-300/15 bg-[#121528] p-4">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/20 text-indigo-100">
        {player?.user.avatar
          ? <img src={player.user.avatar} alt="" className="h-full w-full object-cover" />
          : <span className="font-semibold">{(player?.user.fullName || player?.user.username || label)[0]?.toUpperCase()}</span>}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{player?.user.fullName || player?.user.username || label}</p>
        <p className="mt-1 text-xs text-gray-400">{status}</p>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-3 text-right">
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
      <div>
        <p className="text-sm font-semibold text-indigo-100">
          {player ? `${player.testCasesPassed}/${player.totalTestCases}` : '—'}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-gray-500">
          {player?.verdict || (online ? 'online' : 'offline')}
          {player?.memoryUsed > 0 ? ` · ${player.memoryUsed} MB` : ''}
        </p>
      </div>
    </div>
  </section>
);

const ProblemPanel = ({ problem }) => (
  <section className="h-fit overflow-hidden rounded-2xl border border-indigo-300/15 bg-[#121528]">
    <div className="border-b border-white/10 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-indigo-500/15 px-2 py-1 text-xs font-semibold uppercase text-indigo-200">{problem.difficulty}</span>
        {problem.tags?.map(tag => <span key={tag} className="rounded-md bg-white/5 px-2 py-1 text-xs text-gray-300">{tag}</span>)}
      </div>
      <h2 className="text-xl font-bold text-white">{problem.title}</h2>
      {problem.problemCode && <p className="mt-1 text-xs text-gray-500">{problem.problemCode}</p>}
    </div>
    <div className="space-y-5 p-5">
      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{problem.description}</p>
      {problem.inputFormat && <TextSection title="Input format" text={problem.inputFormat} />}
      {problem.outputFormat && <TextSection title="Output format" text={problem.outputFormat} />}
      {problem.constraints && <TextSection title="Constraints" text={problem.constraints} />}
      {problem.sampleCases?.map((sample, index) => (
        <div key={`${index}-${sample.input}`} className="rounded-lg border border-white/5 bg-black/20 p-3">
          <h3 className="mb-2 text-sm font-semibold text-indigo-200">Sample {index + 1}</h3>
          <p className="text-xs text-gray-400">Input</p>
          <pre className="mb-2 mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-gray-200">{sample.input}</pre>
          <p className="text-xs text-gray-400">Output</p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-gray-200">{sample.expectedOutput}</pre>
        </div>
      ))}
      <p className="text-xs text-gray-500">Both players receive this same problem. Hidden test cases are not shown.</p>
    </div>
  </section>
);

const TextSection = ({ title, text }) => (
  <div>
    <h3 className="mb-1 text-sm font-semibold text-indigo-200">{title}</h3>
    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{text}</p>
  </div>
);

const SubmissionOutput = ({ output }) => (
  <div className="border-t border-white/10 bg-[#0d1020] px-4 py-3 text-sm">
    {output.status === 'running' ? (
      <span className="inline-flex items-center gap-2 text-indigo-200"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking your solution…</span>
    ) : output.error ? (
      <span className="text-red-300">{output.error}</span>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={output.testCasesPassed === output.totalTestCases ? 'text-emerald-300' : 'text-indigo-100'}>
          {output.status === 'accepted' ? 'Accepted' : output.status}
          {' · '}{output.testCasesPassed}/{output.totalTestCases} test cases passed
        </span>
        {output.executionTime > 0 &&         <span className="text-xs text-gray-400">
          {output.executionTime} ms{output.memoryUsed > 0 ? ` · ${output.memoryUsed} MB` : ''}
        </span>}
      </div>
    )}
  </div>
);

export default BattleArenaPage;
