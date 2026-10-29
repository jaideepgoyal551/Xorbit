import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Mic, MicOff,
  RotateCcw, Sparkles, Volume2
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
const LIVE_SOCKET_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const resampleTo16k = (input, inputRate) => {
  if (inputRate === 16000) return input;
  const ratio = inputRate / 16000;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let sample = start; sample < end; sample += 1) sum += input[sample];
    output[index] = sum / Math.max(1, end - start);
  }
  return output;
};

const encodePcmBase64 = samples => {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
};

const decodePcm = base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(Math.floor(bytes.length / 2));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 0x8000;
  }
  return samples;
};

const AiVoiceInterviewPage = () => {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [duration, setDuration] = useState(10);
  const [level, setLevel] = useState('Intermediate');
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const endLock = useRef(false);
  const live = useRef({
    socket: null,
    stream: null,
    context: null,
    source: null,
    processor: null,
    muteGain: null,
    token: null,
    resumptionHandle: null,
    reconnecting: false,
    stopped: false,
    micEnabled: true,
    transcript: [],
    activeTranscript: null,
    playbackTime: 0,
    audioSources: new Set()
  });

  const flushActiveTranscript = useCallback(() => {
    const current = live.current.activeTranscript;
    if (!current?.content.trim()) return;
    live.current.transcript = [...live.current.transcript, current];
    live.current.activeTranscript = null;
    setTranscript(live.current.transcript);
  }, []);

  const addTranscript = useCallback((role, text) => {
    const value = typeof text === 'string' ? text.trim() : '';
    if (!value) return;
    const current = live.current.activeTranscript;
    if (!current || current.role !== role) {
      flushActiveTranscript();
      live.current.activeTranscript = { role, content: value };
    } else if (value.startsWith(current.content)) {
      live.current.activeTranscript = { role, content: value };
    } else if (!current.content.endsWith(value)) {
      live.current.activeTranscript = { role, content: `${current.content} ${value}`.trim() };
    }
    setTranscript([
      ...live.current.transcript,
      ...(live.current.activeTranscript ? [live.current.activeTranscript] : [])
    ]);
  }, [flushActiveTranscript]);

  const stopOutputAudio = useCallback(() => {
    for (const source of live.current.audioSources) {
      source.stop();
    }
    live.current.audioSources.clear();
    live.current.playbackTime = live.current.context?.currentTime || 0;
  }, []);

  const playAudio = useCallback(base64 => {
    const context = live.current.context;
    if (!context || !base64) return;
    const samples = decodePcm(base64);
    const buffer = context.createBuffer(1, samples.length, 24000);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => live.current.audioSources.delete(source);
    const startAt = Math.max(context.currentTime, live.current.playbackTime);
    live.current.playbackTime = startAt + buffer.duration;
    live.current.audioSources.add(source);
    source.start(startAt);
    setStatus('speaking');
  }, []);

  const connectLiveSocket = useCallback((token, resumptionHandle = null) => new Promise((resolve, reject) => {
    const socketUrl = `${LIVE_SOCKET_URL}?access_token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(socketUrl);
    live.current.socket = socket;
    let setupComplete = false;
    const setupTimeout = window.setTimeout(() => {
      if (!setupComplete) {
        socket.close();
        reject(new Error('Gemini Live did not finish setting up. Check your API access and try again.'));
      }
    }, 20000);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        setup: {
          model: `models/${live.current.model}`,
          responseModalities: ['AUDIO'],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          sessionResumption: resumptionHandle ? { handle: resumptionHandle } : {}
        }
      }));
    };

    socket.onmessage = event => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        setError('Gemini Live sent an unreadable response. End the interview and try again.');
        return;
      }
      if (message.error) {
        const detail = message.error.message || 'Gemini Live rejected the session.';
        setError(detail);
        if (!setupComplete) {
          window.clearTimeout(setupTimeout);
          reject(new Error(detail));
        }
        return;
      }
      if (message.setupComplete) {
        setupComplete = true;
        window.clearTimeout(setupTimeout);
        live.current.reconnecting = false;
        setStatus('listening');
        resolve(socket);
        return;
      }
      if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle) {
        live.current.resumptionHandle = message.sessionResumptionUpdate.newHandle;
      }
      if (message.goAway && !live.current.reconnecting && !live.current.stopped) {
        const handle = live.current.resumptionHandle;
        if (!handle) {
          setError('Gemini Live is reconnecting but has no resume token. Please end and restart the interview.');
          return;
        }
        live.current.reconnecting = true;
        setStatus('connecting');
        connectLiveSocket(token, handle).catch(connectionError => {
          live.current.reconnecting = false;
          setError(connectionError.message || 'Could not resume the Gemini Live connection.');
        });
        return;
      }

      const content = message.serverContent;
      if (!content) return;
      if (content.inputTranscription?.text) addTranscript('user', content.inputTranscription.text);
      if (content.outputTranscription?.text) addTranscript('assistant', content.outputTranscription.text);
      for (const part of content.modelTurn?.parts || []) {
        if (part.inlineData?.mimeType?.startsWith('audio/pcm') && part.inlineData.data) {
          playAudio(part.inlineData.data);
        } else if (part.text) {
          addTranscript('assistant', part.text);
        }
      }
      if (content.interrupted) {
        stopOutputAudio();
        setStatus('listening');
      } else if (content.turnComplete) {
        flushActiveTranscript();
        setStatus('listening');
      }
    };

    socket.onerror = () => {
      if (!setupComplete) {
        window.clearTimeout(setupTimeout);
        reject(new Error('Could not connect to Gemini Live. Check your network and API key settings.'));
      } else if (!live.current.stopped) {
        setError('Gemini Live connection encountered a network error.');
      }
    };

    socket.onclose = () => {
      window.clearTimeout(setupTimeout);
      if (!setupComplete && !live.current.stopped) {
        reject(new Error('Gemini Live closed before the session was ready.'));
      } else if (setupComplete && !live.current.stopped && socket === live.current.socket && !live.current.reconnecting) {
        setError('The Gemini Live connection ended. End the interview to review your transcript.');
        setStatus('error');
      }
    };
  }), [addTranscript, flushActiveTranscript, playAudio, stopOutputAudio]);

  const stopLive = useCallback(async () => {
    live.current.stopped = true;
    live.current.processor?.disconnect();
    live.current.source?.disconnect();
    live.current.muteGain?.disconnect();
    live.current.stream?.getTracks().forEach(track => track.stop());
    live.current.socket?.close();
    stopOutputAudio();
    if (live.current.context && live.current.context.state !== 'closed') {
      await live.current.context.close();
    }
    live.current.socket = null;
    live.current.stream = null;
    live.current.context = null;
    live.current.processor = null;
    live.current.source = null;
    live.current.muteGain = null;
  }, [stopOutputAudio]);

  const startMicrophoneStream = useCallback(stream => {
    const context = new window.AudioContext();
    live.current.context = context;
    live.current.stream = stream;
    return context.resume().then(() => {
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const muteGain = context.createGain();
      muteGain.gain.value = 0;
      processor.onaudioprocess = event => {
        const socket = live.current.socket;
        if (!live.current.micEnabled || socket?.readyState !== WebSocket.OPEN || live.current.stopped) return;
        const pcm = resampleTo16k(event.inputBuffer.getChannelData(0), context.sampleRate);
        if (pcm.length) {
          socket.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data: encodePcmBase64(pcm),
                mimeType: 'audio/pcm;rate=16000'
              }
            }
          }));
        }
      };
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(context.destination);
      live.current.source = source;
      live.current.processor = processor;
      live.current.muteGain = muteGain;
    });
  }, []);

  const startInterview = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    endLock.current = false;
    live.current.stopped = false;
    live.current.transcript = [];
    live.current.activeTranscript = null;
    live.current.resumptionHandle = null;
    live.current.reconnecting = false;
    setTranscript([]);
    setReport(null);
    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
        throw new Error('Voice interviews require a supported browser with microphone access over HTTPS or localhost.');
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      live.current.stream = stream;
      const created = await api.startAiInterview({ topic, duration, level, mode: 'voice' });
      const credentials = await api.createAiInterviewLiveToken(created.sessionId);
      live.current.model = credentials.model;
      live.current.token = credentials.token;
      await connectLiveSocket(credentials.token);
      await startMicrophoneStream(stream);
      live.current.micEnabled = true;
      setMicEnabled(true);
      setSession(created);
      setRemaining(duration * 60);
      setStatus('listening');
      const socket = live.current.socket;
      socket.send(JSON.stringify({
        realtimeInput: {
          text: 'Start the interview now. Introduce yourself, read the DSA problem aloud, and ask me to explain my approach.'
        }
      }));
    } catch (requestError) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      await stopLive();
      setStatus('idle');
      setError(requestError.message || 'Could not start the voice interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = useCallback(async () => {
    if (!session || endLock.current) return;
    endLock.current = true;
    setError('');
    setStatus('scoring');
    flushActiveTranscript();
    await stopLive();
    try {
      const result = await api.finishAiInterview(session.sessionId, live.current.transcript);
      setReport(result);
      setSession(null);
      setStatus('complete');
    } catch (requestError) {
      endLock.current = false;
      setStatus('report-error');
      setError(requestError.message || 'Could not generate the report. Your transcript is retained so you can retry.');
    }
  }, [flushActiveTranscript, session, stopLive]);

  useEffect(() => {
    if (!session || report || status === 'report-error') return undefined;
    const timer = window.setInterval(() => {
      setRemaining(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session, report, status]);

  useEffect(() => {
    if (session && remaining === 0 && status !== 'scoring' && status !== 'complete' && status !== 'report-error') {
      generateReport();
    }
  }, [generateReport, remaining, session, status]);

  useEffect(() => () => {
    void stopLive();
  }, [stopLive]);

  const reset = async () => {
    await stopLive();
    setSession(null);
    setRemaining(0);
    setTranscript([]);
    setReport(null);
    setError('');
    setStatus('idle');
    setLoading(false);
    endLock.current = false;
    live.current.transcript = [];
    live.current.activeTranscript = null;
  };

  const toggleMicrophone = () => {
    live.current.micEnabled = !live.current.micEnabled;
    setMicEnabled(live.current.micEnabled);
  };

  const displayedTranscript = [
    ...transcript,
    ...(live.current.activeTranscript ? [live.current.activeTranscript] : [])
  ];
  const hasCandidateAnswer = displayedTranscript.some(message => message.role === 'user');

  return (
    <div className="ai-interview-page ai-voice-page mx-auto w-full max-w-6xl pb-10 text-white">
      {!session ? (
        report ? (
          <section className="ai-interview-panel ai-interview-results">
            <Link to="/ai-interview" className="ai-interview-back-button"><ArrowLeft className="h-4 w-4" /> Interview practice</Link>
            <div className="ai-interview-result-heading">
              <div>
                <span className="ai-interview-eyebrow"><CheckCircle2 className="h-3.5 w-3.5" /> VOICE SESSION COMPLETE</span>
                <h1>Your AI voice interview report</h1>
                <p>{report.topic} <span>·</span> {report.level} <span>·</span> {report.duration} min</p>
              </div>
              <div className="ai-interview-score-ring" style={{ '--score': `${report.score}%` }}>
                <div><strong>{report.score}</strong><span>/100</span></div>
              </div>
            </div>
            <p className="ai-interview-summary">{report.summary}</p>
            <div className="ai-interview-criteria-grid">
              {report.criteria.map(item => (
                <article className="ai-interview-criterion" key={item.name}>
                  <div className="ai-interview-criterion-title"><h3>{item.name}</h3><strong>{item.score}<span>/10</span></strong></div>
                  <div className="ai-interview-score-bar"><span style={{ width: `${item.score * 10}%` }} /></div>
                  <p>{item.feedback}</p>
                </article>
              ))}
            </div>
            <div className="ai-interview-feedback-grid">
              <article><h2><CheckCircle2 className="h-4 w-4" /> Strengths</h2><ul>{report.strengths.map(item => <li key={item}>{item}</li>)}</ul></article>
              <article><h2><AlertCircle className="h-4 w-4" /> Areas to improve</h2><ul>{report.improvements.map(item => <li key={item}>{item}</li>)}</ul></article>
            </div>
            <div className="ai-interview-next-step"><Sparkles className="h-4 w-4" /><div><strong>Suggested next step</strong><p>{report.nextStep}</p></div></div>
            <button className="ai-interview-primary-button ai-interview-restart" onClick={reset}><RotateCcw className="h-4 w-4" /> Start another voice interview</button>
          </section>
        ) : (
          <>
            <Link to="/ai-interview" className="ai-interview-back-button ai-voice-back"><ArrowLeft className="h-4 w-4" /> Interview practice</Link>
            <section className="ai-interview-hero">
              <div className="ai-interview-hero-orb" />
              <div className="ai-interview-hero-content">
                <span className="ai-interview-eyebrow"><Sparkles className="h-3.5 w-3.5" /> XORBITS LIVE PRACTICE STUDIO</span>
                <h1>Practice out loud with Gemini Live.</h1>
                <p>Have a real-time spoken DSA interview, get live transcription, and receive a personalized report when you finish.</p>
                <div className="ai-interview-benefits">
                  <span><Mic className="h-4 w-4" /> Live voice conversation</span>
                  <span><Clock3 className="h-4 w-4" /> Up to 15 minutes</span>
                  <span><BrainCircuit className="h-4 w-4" /> AI feedback report</span>
                </div>
              </div>
              <div className="ai-interview-hero-icon"><Mic className="h-10 w-10" /></div>
            </section>

            <div className="ai-interview-setup-grid">
              <form className="ai-interview-panel ai-interview-setup" onSubmit={startInterview}>
                <div className="ai-interview-panel-heading">
                  <div className="ai-interview-heading-icon"><BrainCircuit className="h-5 w-5" /></div>
                  <div><h2>Set up your voice session</h2><p>Choose your topic, duration, and level.</p></div>
                </div>
                <label className="ai-interview-field">
                  <span>DSA focus</span>
                  <select value={topic} onChange={event => setTopic(event.target.value)}>{TOPICS.map(item => <option key={item}>{item}</option>)}</select>
                </label>
                <fieldset className="ai-interview-field">
                  <legend>Interview length</legend>
                  <div className="ai-interview-choice-row">
                    {DURATIONS.map(minutes => (
                      <button type="button" key={minutes} aria-pressed={duration === minutes} onClick={() => setDuration(minutes)} className={duration === minutes ? 'is-selected' : ''}>
                        <strong>{minutes}</strong><span>min</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="ai-interview-field">
                  <legend>Experience level</legend>
                  <div className="ai-interview-levels">
                    {LEVELS.map(item => (
                      <button type="button" key={item} aria-pressed={level === item} onClick={() => setLevel(item)} className={level === item ? 'is-selected' : ''}>{item}</button>
                    ))}
                  </div>
                </fieldset>
                {error && <p className="ai-interview-error" role="alert">{error}</p>}
                <button className="ai-interview-primary-button" type="submit" disabled={loading}>
                  {loading ? <span className="ai-interview-spinner" /> : <Mic className="h-4 w-4" />}
                  {loading ? 'Connecting to Gemini Live…' : 'Start voice interview'}
                </button>
                <p className="ai-interview-privacy-note">Gemini 2.5 Flash Native Audio currently has free-tier pricing, subject to Google’s quotas. Google may use free-tier prompts and responses to improve its products. Avoid sensitive information. The API key remains on the backend; the browser receives only a short-lived, single-use token.</p>
              </form>

              <aside className="ai-interview-panel ai-interview-howto">
                <span className="ai-interview-card-kicker">BEFORE YOU START</span>
                <h2>Give your ideas a voice.</h2>
                <div className="ai-interview-step"><span>01</span><div><h3>Allow microphone access</h3><p>Use a quiet space and headphones for clearer audio.</p></div></div>
                <div className="ai-interview-step"><span>02</span><div><h3>Think out loud</h3><p>Explain assumptions, algorithm choices, edge cases, and complexity.</p></div></div>
                <div className="ai-interview-step"><span>03</span><div><h3>Review your report</h3><p>Get strengths, improvement areas, and skill-by-skill scores.</p></div></div>
                <div className="ai-interview-note"><Volume2 className="h-4 w-4" /> Microphone access requires HTTPS or localhost.</div>
              </aside>
            </div>
          </>
        )
      ) : (
        <section className="ai-interview-panel ai-voice-session">
          <header className="ai-voice-header">
            <div className="ai-interview-session-title">
              <div className="ai-interview-heading-icon"><BrainCircuit className="h-5 w-5" /></div>
              <div><h1>AI Voice Interview</h1><p>{session.topic} <span>·</span> {session.level}</p></div>
            </div>
            <div className={`ai-interview-timer ${remaining < 60 ? 'is-low' : ''}`} aria-live="polite"><Clock3 className="h-4 w-4" /> {formatTime(remaining)}</div>
          </header>
          <div className="ai-interview-session-progress"><span style={{ width: `${Math.min(100, ((session.duration * 60 - remaining) / (session.duration * 60)) * 100)}%` }} /></div>
          <div className="ai-voice-status" aria-live="polite">
            <span className={`ai-voice-status-orb is-${status}`}><Volume2 className="h-7 w-7" /></span>
            <strong>{status === 'connecting' ? 'Connecting' : status === 'speaking' ? 'Interviewer speaking' : status === 'scoring' ? 'Preparing your report' : 'Listening'}</strong>
            <span>{status === 'connecting' ? 'Reconnecting to your live session…' : status === 'speaking' ? 'Speak whenever you are ready; you can interrupt.' : status === 'scoring' ? 'Gemini is reviewing the interview transcript.' : 'Explain your reasoning clearly and take your time.'}</span>
          </div>
          <div className="ai-voice-transcript" aria-live="polite">
            {displayedTranscript.length ? displayedTranscript.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`ai-voice-message ${message.role === 'user' ? 'from-user' : 'from-ai'}`}>
                <strong>{message.role === 'user' ? 'You' : 'Interviewer'}</strong><p>{message.content}</p>
              </article>
            )) : <p className="ai-voice-transcript-empty">Your conversation transcript will appear here.</p>}
          </div>
          {error && <p className="ai-interview-error ai-voice-error" role="alert">{error}</p>}
          {status === 'report-error' ? (
            <div className="ai-voice-controls">
              <button className="ai-interview-primary-button" onClick={generateReport} disabled={loading}><RotateCcw className="h-4 w-4" /> Retry report</button>
              <button className="ai-voice-end-button" onClick={reset}>Discard session</button>
            </div>
          ) : (
            <div className="ai-voice-controls">
              <button className={`ai-voice-mic-button ${micEnabled ? '' : 'is-muted'}`} onClick={toggleMicrophone} disabled={status === 'scoring'} aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}>
                {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                {micEnabled ? 'Microphone on' : 'Microphone muted'}
              </button>
              <button className="ai-voice-end-button" onClick={generateReport} disabled={status === 'scoring' || !hasCandidateAnswer}>
                {status === 'scoring' ? 'Preparing report…' : 'End interview'}
              </button>
            </div>
          )}
          <p className="ai-voice-footer-note">Live audio is sent to Gemini for the conversation and report. Transcription is shown here while this page is open.</p>
        </section>
      )}
    </div>
  );
};

export default AiVoiceInterviewPage;
