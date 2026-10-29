import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bot, BrainCircuit, CheckCircle2, Clock3,
  MessageSquareText, RotateCcw, Send, Sparkles, Target, Trophy
} from 'lucide-react';
import api from '../services/api';

const TOPICS = [
  'Mixed DSA',
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack & Queue',
  'Binary Search',
  'Linked Lists',
  'Trees & Graphs',
  'Dynamic Programming',
  'Greedy & Intervals'
];
const DURATIONS = [5, 10, 15];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const AiInterviewPage = () => {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [duration, setDuration] = useState(10);
  const [level, setLevel] = useState('Intermediate');
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  const finishLock = useRef(false);
  const autoFinishRequested = useRef(false);
  const transcriptEnd = useRef(null);

  const finishInterview = useCallback(async () => {
    if (!session || finishLock.current || evaluation) return;
    finishLock.current = true;
    setFinishing(true);
    setError('');
    try {
      const result = await api.finishAiInterview(session.sessionId);
      setEvaluation(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not prepare your interview feedback. Please try again.');
      finishLock.current = false;
    } finally {
      setFinishing(false);
    }
  }, [session, evaluation]);

  useEffect(() => {
    if (!session || evaluation) return undefined;
    const timer = window.setInterval(() => {
      setRemaining(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session, evaluation]);

  useEffect(() => {
    if (session && !evaluation && remaining === 0 && !loading && !finishing && !autoFinishRequested.current) {
      autoFinishRequested.current = true;
      finishInterview();
    }
  }, [session, evaluation, remaining, loading, finishing, finishInterview]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const startInterview = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessages([]);
    setEvaluation(null);
    finishLock.current = false;
    autoFinishRequested.current = false;
    try {
      const result = await api.startAiInterview({ topic, duration, level });
      setSession(result);
      setRemaining(duration * 60);
      setMessages([{ role: 'assistant', content: result.message }]);
    } catch (requestError) {
      setError(requestError.message || 'Could not start the AI interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async event => {
    event.preventDefault();
    const text = answer.trim();
    if (!text || !session || loading || remaining <= 0) return;

    const previousMessages = messages;
    setMessages(current => [...current, { role: 'user', content: text }]);
    setAnswer('');
    setLoading(true);
    setError('');
    try {
      const result = await api.answerAiInterview(session.sessionId, text);
      setMessages(current => [...current, { role: 'assistant', content: result.message }]);
    } catch (requestError) {
      setMessages(previousMessages);
      setAnswer(text);
      setError(requestError.message || 'Your answer could not be sent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetInterview = () => {
    setSession(null);
    setMessages([]);
    setAnswer('');
    setRemaining(0);
    setEvaluation(null);
    setError('');
    setFinishing(false);
    finishLock.current = false;
    autoFinishRequested.current = false;
  };

  return (
    <div className="ai-interview-page mx-auto w-full max-w-6xl pb-10 text-white">
      {!session && !evaluation ? (
        <>
          <section className="ai-interview-hero">
            <div className="ai-interview-hero-orb" />
            <div className="ai-interview-hero-content">
              <span className="ai-interview-eyebrow"><Sparkles className="h-3.5 w-3.5" /> XORBITS PRACTICE STUDIO</span>
              <h1>Practice your next DSA interview for free.</h1>
              <p>Talk through a DSA problem, work through guided follow-ups, then get an instant rubric-based scorecard.</p>
              <div className="ai-interview-benefits">
                <span><Clock3 className="h-4 w-4" /> 5, 10, or 15 minutes</span>
                <span><Target className="h-4 w-4" /> DSA-focused questions</span>
                <span><Trophy className="h-4 w-4" /> Personal scorecard</span>
              </div>
            </div>
            <div className="ai-interview-hero-icon"><BrainCircuit className="h-10 w-10" /></div>
          </section>

          <div className="ai-interview-setup-grid">
            <form className="ai-interview-panel ai-interview-setup" onSubmit={startInterview}>
              <div className="ai-interview-panel-heading">
                <div className="ai-interview-heading-icon"><MessageSquareText className="h-5 w-5" /></div>
                <div>
                  <h2>Set up your session</h2>
                  <p>Choose a focus and difficulty that feels right.</p>
                </div>
              </div>

              <label className="ai-interview-field">
                <span>DSA focus</span>
                <select value={topic} onChange={event => setTopic(event.target.value)}>
                  {TOPICS.map(item => <option key={item}>{item}</option>)}
                </select>
              </label>

              <fieldset className="ai-interview-field">
                <legend>Interview length</legend>
                <div className="ai-interview-choice-row">
                  {DURATIONS.map(minutes => (
                    <button
                      type="button"
                      key={minutes}
                      aria-pressed={duration === minutes}
                      onClick={() => setDuration(minutes)}
                      className={duration === minutes ? 'is-selected' : ''}
                    >
                      <strong>{minutes}</strong><span>min</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ai-interview-field">
                <legend>Experience level</legend>
                <div className="ai-interview-levels">
                  {LEVELS.map(item => (
                    <button
                      type="button"
                      key={item}
                      aria-pressed={level === item}
                      onClick={() => setLevel(item)}
                      className={level === item ? 'is-selected' : ''}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && <p className="ai-interview-error" role="alert">{error}</p>}
              <button className="ai-interview-primary-button" type="submit" disabled={loading}>
                {loading ? <span className="ai-interview-spinner" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Preparing your interview…' : 'Start free interview'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
              <p className="ai-interview-privacy-note">No paid AI API is used. Your answers stay in the active session and the score is an automated estimate, not a code execution or correctness guarantee.</p>
            </form>

            <aside className="ai-interview-panel ai-interview-howto">
              <span className="ai-interview-card-kicker">HOW IT WORKS</span>
              <h2>Think out loud. Learn as you go.</h2>
              <div className="ai-interview-step">
                <span>01</span><div><h3>Get a DSA problem</h3><p>Choose a focus and get a question from the built-in practice bank.</p></div>
              </div>
              <div className="ai-interview-step">
                <span>02</span><div><h3>Explain your approach</h3><p>Share your reasoning and work through structured follow-up prompts.</p></div>
              </div>
              <div className="ai-interview-step">
                <span>03</span><div><h3>Review your scorecard</h3><p>Get a score out of 100 plus strengths and suggested next steps.</p></div>
              </div>
              <div className="ai-interview-note"><Bot className="h-4 w-4" /> This is a practice tool, not a substitute for a human interviewer.</div>
            </aside>
          </div>
        </>
      ) : evaluation ? (
        <section className="ai-interview-panel ai-interview-results">
          <button className="ai-interview-back-button" onClick={resetInterview}><ArrowLeft className="h-4 w-4" /> Interview setup</button>
          <div className="ai-interview-result-heading">
            <div>
              <span className="ai-interview-eyebrow"><CheckCircle2 className="h-3.5 w-3.5" /> SESSION COMPLETE</span>
              <h1>Your interview scorecard</h1>
              <p>{evaluation.topic} <span>·</span> {evaluation.level} <span>·</span> {evaluation.duration} min</p>
            </div>
            <div className="ai-interview-score-ring" style={{ '--score': `${evaluation.score}%` }}>
              <div><strong>{evaluation.score}</strong><span>/100</span></div>
            </div>
          </div>
          <p className="ai-interview-summary">{evaluation.summary}</p>

          <div className="ai-interview-criteria-grid">
            {evaluation.criteria.map(item => (
              <article className="ai-interview-criterion" key={item.name}>
                <div className="ai-interview-criterion-title"><h3>{item.name}</h3><strong>{item.score}<span>/10</span></strong></div>
                <div className="ai-interview-score-bar"><span style={{ width: `${item.score * 10}%` }} /></div>
                <p>{item.feedback}</p>
              </article>
            ))}
          </div>

          <div className="ai-interview-feedback-grid">
            <article>
              <h2><CheckCircle2 className="h-4 w-4" /> What went well</h2>
              {evaluation.strengths.length
                ? <ul>{evaluation.strengths.map(item => <li key={item}>{item}</li>)}</ul>
                : <p>Keep explaining your thinking clearly as you practice.</p>}
            </article>
            <article>
              <h2><Target className="h-4 w-4" /> Focus for next time</h2>
              {evaluation.improvements.length
                ? <ul>{evaluation.improvements.map(item => <li key={item}>{item}</li>)}</ul>
                : <p>Try a new problem in the same topic to build consistency.</p>}
            </article>
          </div>
          <div className="ai-interview-next-step"><Sparkles className="h-4 w-4" /><div><strong>Your next step</strong><p>{evaluation.nextStep}</p></div></div>
          <button className="ai-interview-primary-button ai-interview-restart" onClick={resetInterview}>
            <RotateCcw className="h-4 w-4" /> Practice another interview
          </button>
        </section>
      ) : (
        <section className="ai-interview-panel ai-interview-session">
          <header className="ai-interview-session-header">
            <div className="ai-interview-session-title">
              <button className="ai-interview-back-button" onClick={resetInterview} aria-label="Leave interview"><ArrowLeft className="h-4 w-4" /></button>
              <div className="ai-interview-heading-icon"><BrainCircuit className="h-5 w-5" /></div>
              <div><h1>Guided DSA Interview</h1><p>{session.topic} <span>·</span> {session.level}</p></div>
            </div>
            <div className={`ai-interview-timer ${remaining < 60 ? 'is-low' : ''}`} aria-live="polite">
              <Clock3 className="h-4 w-4" /> {formatTime(remaining)}
            </div>
          </header>

          <div className="ai-interview-session-progress"><span style={{ width: `${Math.min(100, ((session.duration * 60 - remaining) / (session.duration * 60)) * 100)}%` }} /></div>

          <div className="ai-interview-transcript" aria-live="polite">
            <div className="ai-interview-session-hint"><Sparkles className="h-4 w-4" /> Take a moment to think. Explain your reasoning as if this were a real interview.</div>
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`ai-interview-message ${message.role === 'user' ? 'from-user' : 'from-ai'}`}>
                {message.role === 'assistant' && <span className="ai-interview-message-avatar"><Bot className="h-4 w-4" /></span>}
                <p>{message.content}</p>
                {message.role === 'user' && <span className="ai-interview-message-avatar"><MessageSquareText className="h-4 w-4" /></span>}
              </article>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="ai-interview-typing"><span /><span /><span /> Interviewer is thinking</div>
            )}
            {finishing && <div className="ai-interview-typing"><span /><span /><span /> Preparing your scorecard</div>}
            <div ref={transcriptEnd} />
          </div>

          {error && <p className="ai-interview-error ai-interview-session-error" role="alert">{error}</p>}

          <form className="ai-interview-composer" onSubmit={sendAnswer}>
            <textarea
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              placeholder="Explain your approach, ask a question, or share pseudocode…"
              maxLength={4000}
              aria-label="Your interview response"
              disabled={loading || finishing || remaining <= 0}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="ai-interview-composer-footer">
              <span>Enter to send · Shift + Enter for a new line</span>
              <button type="submit" disabled={!answer.trim() || loading || finishing || remaining <= 0}>
                <Send className="h-4 w-4" /> Send answer
              </button>
            </div>
          </form>
          <div className="ai-interview-session-bottom">
            <span>Your score is based on reasoning, correctness, communication, and complexity analysis.</span>
            <button onClick={finishInterview} disabled={finishing || loading || !messages.some(message => message.role === 'user')}>
              {finishing ? 'Scoring…' : 'Finish interview'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default AiInterviewPage;
