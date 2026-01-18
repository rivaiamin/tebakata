import React, { useState, useEffect, useRef } from 'react';
import { Share2, Send, RefreshCw, Volume2, VolumeX, HelpCircle, Loader2 } from 'lucide-react';

// --- GEMINI API CONFIG ---
const apiKey = ""; // Environment will provide this at runtime
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

async function fetchDailyWordFromAI() {
  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = `You are a game data generator. Generate a unique, interesting secret word for a "20 Questions" style game for the date: ${today}.
  The word can be an animal, famous person, city, or object.
  Provide a list of 30-40 single-word "traits" or "characteristics" that describe it.
  Return ONLY a JSON object with this structure:
  { "target": "Word", "traits": ["trait1", "trait2", ...] }`;

  const payload = {
    contents: [{ parts: [{ text: `Generate the daily word for ${today}` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  // Exponential backoff fetch
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!response.ok) throw new Error('API limit or error');
      const result = await response.json();
      return JSON.parse(result.candidates[0].content.parts[0].text);
    } catch (err) {
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed to fetch daily word after 5 retries.");
}

// --- SOUND SYNTHESIZER ---
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'hit') {
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'miss') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.1, now);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'win') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(659, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      osc.start(now); osc.stop(now + 0.5);
    }
  } catch (e) {}
};

// --- COMPONENTS ---
const Avatar = ({ state, message }) => {
  const getAnimationClass = () => {
    switch(state) {
      case 'happy': return 'animate-bounce';
      case 'sad': return 'animate-shake';
      case 'win': return 'animate-bounce duration-75';
      default: return 'animate-pulse';
    }
  };

  const Face = () => {
    if (state === 'happy') return <div className="text-4xl">😄</div>;
    if (state === 'sad') return <div className="text-4xl">😣</div>;
    if (state === 'win') return <div className="text-4xl">🥳</div>;
    return <div className="text-4xl">🤔</div>;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-6">
      <div className={`relative bg-white text-gray-800 p-4 rounded-2xl shadow-lg border border-gray-200 max-w-xs text-center transition-all duration-300 ${state === 'happy' ? 'scale-105 border-green-400' : ''}`}>
        <p className="font-medium text-lg">{message}</p>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-b border-r border-gray-200"></div>
      </div>
      <div className={`w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white ${getAnimationClass()}`}>
        <Face />
      </div>
    </div>
  );
};

export default function DailyGuessGame() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [foundTraits, setFoundTraits] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [gameState, setGameState] = useState("playing");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [avatarState, setAvatarState] = useState("idle");
  const [avatarMessage, setAvatarMessage] = useState("Generating today's challenge...");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const MAX_GUESSES = 20;
  const inputRef = useRef(null);

  useEffect(() => {
    fetchDailyWordFromAI()
      .then(wordData => {
        setData(wordData);
        setStartTime(Date.now());
        setAvatarMessage("I'm thinking of something. Guess a trait!");
        setLoading(false);
      })
      .catch(err => {
        setError("Couldn't reach the Game Master. Please try again later.");
        setLoading(false);
      });
  }, []);

  const handleGuess = (e) => {
    e.preventDefault();
    if (!currentInput.trim() || gameState !== 'playing') return;

    const guess = currentInput.trim().toLowerCase();
    if (guesses.includes(guess)) return;

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentInput("");

    const isTarget = guess === data.target.toLowerCase();
    const isTrait = data.traits.some(t => t.toLowerCase() === guess);

    if (isTarget) {
      setGameState('won');
      setEndTime(Date.now());
      setAvatarState('win');
      setAvatarMessage(`YES! It was ${data.target}!`);
      if (soundEnabled) playSound('win');
    } else if (isTrait) {
      setFoundTraits([...foundTraits, guess]);
      setAvatarState('happy');
      setAvatarMessage("Correct! That's a characteristic.");
      if (soundEnabled) playSound('hit');
    } else {
      setAvatarState('sad');
      setAvatarMessage("Nope, not that.");
      if (soundEnabled) playSound('miss');
    }

    if (!isTarget && newGuesses.length >= MAX_GUESSES) {
      setGameState('lost');
      setEndTime(Date.now());
      setAvatarMessage(`Out of turns! It was ${data.target}.`);
    }

    if (gameState === 'playing' && !isTarget) {
      setTimeout(() => setAvatarState('idle'), 1500);
    }
  };

  const getFormattedTime = () => {
    const end = endTime || Date.now();
    const start = startTime || Date.now();
    const s = Math.floor((end - start) / 1000);
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100 space-y-4">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Consulting Gemini for today's word...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-6 text-center">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <p className="text-slate-700 font-bold text-xl">{error}</p>
      <button onClick={() => window.location.reload()} className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg">Retry</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col items-center">
      <header className="w-full bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">DailyGuess AI</h1>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-full hover:bg-slate-100">
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${guesses.length > 15 ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>
              {guesses.length}/{MAX_GUESSES}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md p-4 flex flex-col space-y-4 pb-24">
        <div className="bg-white rounded-3xl p-4 shadow-sm min-h-[220px] flex flex-col justify-center border border-slate-200">
           <Avatar state={avatarState} message={avatarMessage} />
        </div>

        <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-inner min-h-[120px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Found Traits</h3>
          <div className="flex flex-wrap gap-2">
            {foundTraits.length === 0 ? (
              <span className="text-slate-400 text-sm italic">Reveal clues by guessing traits...</span>
            ) : (
              foundTraits.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold shadow-sm animate-in zoom-in">
                  {t}
                </span>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full bg-white border-t border-slate-200 p-4 pb-6">
        <div className="max-w-md mx-auto">
          {gameState === 'playing' ? (
            <form onSubmit={handleGuess} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Characteristic or the Word..."
                className="flex-1 bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all font-medium text-lg"
                autoFocus
              />
              <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                <Send size={24} />
              </button>
            </form>
          ) : (
            <div className="flex flex-col space-y-3">
               <button onClick={() => {
                 const score = gameState === 'won' ? guesses.length : 'X';
                 navigator.clipboard.writeText(`🕵️ Daily Guess AI\nScore: ${score}/${MAX_GUESSES}\nTime: ${getFormattedTime()}\n#DailyGuess`);
                 alert("Copied!");
               }} className="w-full bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
                <Share2 size={20} /> Share Result
              </button>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <RefreshCw size={20} /> Next Challenge
              </button>
            </div>
          )}
        </div>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 2; }
      `}</style>
    </div>
  );
}