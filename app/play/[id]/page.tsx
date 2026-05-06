"use client";

import { use, useState, useRef, useEffect } from "react";
import { decodeScenario } from "@/lib/scenario";
import { NegotiationGlossary } from "@/components/NegotiationGlossary";
import type { Scenario, ChatMessage, DebriefResult } from "@/lib/types";
import type { CoachData } from "@/app/api/coach/route";

export default function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const scenario: Scenario = decodeScenario(id);

  const [phase, setPhase] = useState<"name" | "choose" | "play" | "deal-modal" | "debrief">("name");
  const [playerName, setPlayerName] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [humanRole, setHumanRole] = useState<"buyer" | "seller">("buyer");
  const [isAiVsAi, setIsAiVsAi] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [dealInput, setDealInput] = useState("");
  const [debrief, setDebrief] = useState<DebriefResult | null>(null);
  const [debriefError, setDebriefError] = useState("");
  const [aiVsAiRunning, setAiVsAiRunning] = useState(false);
  const [coachVisible, setCoachVisible] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [rightTab, setRightTab] = useState<"coach" | "score">("coach");
  // Timer state
  const timeLimitSec = Number(scenario.timeLimit ?? 0) * 60;
  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const [startTime, setStartTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const moveCountRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const aiVsAiRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);

  // Smart auto-scroll: always snap on a new message; during streaming only
  // follow if user hasn't scrolled up (within 120px of bottom).
  useEffect(() => {
    const el = scrollContainerRef.current;
    const isNewMessage = messages.length > prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;

    const isNearBottom = el
      ? el.scrollTop + el.clientHeight >= el.scrollHeight - 120
      : true;

    if (isNewMessage || isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText]);

  // ── Timer countdown ──
  useEffect(() => {
    if (phase !== "play" || timeLimitSec === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleTimeout() {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    patchSession({ status: "completed", outcome: "timeout", endTime: Date.now(), timeElapsed: elapsed });
    fetchDebrief(messages, "timeout", "");
  }

  const aiRole = humanRole === "buyer" ? "seller" : "buyer";
  const myBrief = humanRole === "buyer" ? scenario.buyerBrief : scenario.sellerBrief;

  // ── Session helpers ──
  async function createSession(role: "buyer" | "seller" | "observer", name: string) {
    const now = Date.now();
    setStartTime(now);
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        playerName: name,
        scenarioTitle: scenario.title,
        scenarioEncoded: id,
        role,
        startTime: now,
        timeLimit: timeLimitSec,
        moves: 0,
        liveScore: 0,
        status: "active",
      }),
    });
  }

  async function patchSession(patch: Record<string, unknown>) {
    await fetch(`/api/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  // ── Live coach ──
  async function fetchCoach(history: ChatMessage[]) {
    if (isAiVsAi || history.length < 2) return;
    setCoachLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, messages: history, humanRole }),
      });
      const data = await res.json();
      if (!data.error) {
        setCoachData(data);
        patchSession({ liveScore: data.liveScore?.overall ?? 0, moves: moveCountRef.current });
      }
    } catch { /* silent */ }
    finally { setCoachLoading(false); }
  }

  // ── Voice input ──
  function toggleVoice() {
    setVoiceError("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice input not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInputText(transcript);
    };

    recognition.onerror = (e) => {
      setVoiceError(e.error === "not-allowed" ? "Microphone access denied." : `Voice error: ${e.error}`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  }

  // ── Stream one AI turn ──
  async function callNegotiateAPI(
    history: ChatMessage[],
    roleForAI: "buyer" | "seller"
  ): Promise<string> {
    const res = await fetch("/api/negotiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, messages: history, aiRole: roleForAI }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error ?? "Request failed");
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";
    setStreamingText("");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      full += chunk;
      setStreamingText((t) => t + chunk);
    }
    setStreamingText("");
    return full;
  }

  // ── Start game ──
  async function startGame(role: "buyer" | "seller", aiVsAi = false) {
    setHumanRole(role);
    setIsAiVsAi(aiVsAi);
    setPhase("play");
    setMessages([]);
    moveCountRef.current = 0;
    setTimeLeft(timeLimitSec);
    await createSession(aiVsAi ? "observer" : role, playerName);

    const openingRole: "buyer" | "seller" = aiVsAi ? "buyer" : role === "seller" ? "buyer" : "seller";
    setIsLoading(true);
    try {
      const opening = await callNegotiateAPI([], openingRole);
      const openingMsg: ChatMessage = { role: openingRole, content: opening };
      setMessages([openingMsg]);
      if (!aiVsAi) { fetchCoach([openingMsg]); }
      if (aiVsAi) {
        aiVsAiRef.current = true;
        setAiVsAiRunning(true);
        runAiVsAi([openingMsg], "seller");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  // ── AI vs AI loop ──
  async function runAiVsAi(history: ChatMessage[], nextRole: "buyer" | "seller") {
    if (!aiVsAiRef.current) return;
    if (history.length >= 24) { setAiVsAiRunning(false); return; }
    setIsLoading(true);
    try {
      const reply = await callNegotiateAPI(history, nextRole);
      if (!aiVsAiRef.current) return;
      const newMsg: ChatMessage = { role: nextRole, content: reply };
      const newHistory = [...history, newMsg];
      setMessages(newHistory);
      if (reply.includes("[DEAL REACHED]") || reply.includes("[WALK AWAY]")) {
        setAiVsAiRunning(false);
        aiVsAiRef.current = false;
        const out = reply.includes("[DEAL REACHED]") ? "deal" : "walk_away";
        await fetchDebrief(newHistory, out, "");
        return;
      }
      const opp = nextRole === "buyer" ? "seller" : "buyer";
      setTimeout(() => runAiVsAi(newHistory, opp), 800);
    } catch (e) {
      console.error(e);
      setAiVsAiRunning(false);
    } finally {
      setIsLoading(false);
    }
  }

  function stopAiVsAi() {
    aiVsAiRef.current = false;
    setAiVsAiRunning(false);
    setIsLoading(false);
  }

  // ── Human sends a message (typed or chosen) ──
  async function sendMessage(text?: string) {
    const content = (text ?? inputText).trim();
    if (!content || isLoading) return;
    moveCountRef.current += 1;
    patchSession({ moves: moveCountRef.current });
    const userMsg: ChatMessage = { role: humanRole, content };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText("");
    setIsLoading(true);
    try {
      const reply = await callNegotiateAPI(newHistory, aiRole);
      const aiMsg: ChatMessage = { role: aiRole, content: reply };
      const finalHistory = [...newHistory, aiMsg];
      setMessages(finalHistory);
      if (reply.includes("[DEAL REACHED]")) {
        setPhase("deal-modal");
      } else if (reply.includes("[WALK AWAY]")) {
        await fetchDebrief(finalHistory, "walk_away", "");
      } else {
        fetchCoach(finalHistory);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmDeal() {
    setPhase("play");
    await fetchDebrief(messages, "deal", dealInput);
  }

  async function walkAway() {
    await fetchDebrief(messages, "walk_away", "");
  }

  async function fetchDebrief(history: ChatMessage[], out: string, finalVal: string) {
    clearInterval(timerRef.current!);
    setIsLoading(true);
    setDebriefError("");
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          messages: history,
          humanRole: isAiVsAi ? "buyer" : humanRole,
          outcome: out,
          finalValue: finalVal,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDebrief(data);
      patchSession({
        status: "completed",
        outcome: out,
        endTime: Date.now(),
        finalScore: data.overallScore,
        liveScore: data.overallScore,
        timeElapsed: elapsed,
        moves: moveCountRef.current,
      });
    } catch (e) {
      setDebriefError(e instanceof Error ? e.message : "Debrief failed");
      setDebrief(null);
      patchSession({ status: "completed", outcome: out, endTime: Date.now(), timeElapsed: elapsed });
    } finally {
      setIsLoading(false);
      setPhase("debrief");
    }
  }

  // ─────────────────────────────────────────────
  // NAME ENTRY
  // ─────────────────────────────────────────────
  if (phase === "name") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div>
            <p className="text-xs text-indigo-400 uppercase tracking-widest mb-2">Negotiation Trainer</p>
            <h1 className="text-2xl font-bold text-white">{scenario.title}</h1>
            {(scenario.timeLimit ?? 0) > 0 && (
              <p className="text-sm text-amber-400 mt-2">⏱ {scenario.timeLimit} minute time limit</p>
            )}
          </div>
          <div className="space-y-3">
            <input
              autoFocus
              className="w-full bg-slate-800 border border-slate-600 focus:border-indigo-500 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-3 text-center text-lg outline-none transition-colors"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && playerName.trim() && setPhase("choose")}
            />
            <button
              onClick={() => setPhase("choose")}
              disabled={!playerName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // CHOOSE ROLE
  // ─────────────────────────────────────────────
  if (phase === "choose") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center">
            <p className="text-sm text-indigo-400 uppercase tracking-widest mb-2">
              {scenario.difficulty.toUpperCase()} difficulty
            </p>
            <h1 className="text-3xl font-bold text-white">{scenario.title}</h1>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed">{scenario.context}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-slate-400">
            <p className="font-medium text-slate-300 mb-1">What&apos;s being negotiated</p>
            <p>{scenario.variables}</p>
          </div>
          <NegotiationGlossary compact />
          <div className="space-y-3">
            <p className="text-center text-xs text-slate-500 uppercase tracking-widest">Choose your role</p>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard title="Play as Buyer" role={scenario.buyerBrief.role} color="indigo" onClick={() => startGame("buyer")} />
              <RoleCard title="Play as Seller" role={scenario.sellerBrief.role} color="amber" onClick={() => startGame("seller")} />
            </div>
            <button
              onClick={() => startGame("buyer", true)}
              className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors"
            >
              Watch AI vs AI Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // DEBRIEF
  // ─────────────────────────────────────────────
  if (phase === "debrief") {
    if (debriefError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <p className="text-red-400 font-semibold">Debrief failed</p>
            <p className="text-slate-400 text-sm">{debriefError}</p>
            <button onClick={() => window.location.reload()} className="text-indigo-400 text-sm underline">
              Try again
            </button>
          </div>
        </div>
      );
    }
    if (debrief) return <DebriefView debrief={debrief} scenario={scenario} isAiVsAi={isAiVsAi} encodedId={id} />;
  }

  const rounds = Math.ceil(messages.length / 2);

  // ─────────────────────────────────────────────
  // GAME
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden h-screen">
      {/* Brief panel */}
      <aside className="w-full md:w-72 shrink-0 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-5 space-y-4 overflow-y-auto">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Scenario</p>
          <p className="text-sm font-semibold text-white mt-1">{scenario.title}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Your Role</p>
          <p className={`text-sm font-semibold mt-1 ${isAiVsAi ? "text-slate-300" : humanRole === "buyer" ? "text-indigo-400" : "text-amber-400"}`}>
            {isAiVsAi ? "Observer" : myBrief.role}
          </p>
        </div>
        {!isAiVsAi && (
          <>
            <BriefItem label="Your Objective" value={myBrief.objective} />
            <BriefItem
              label="MDO — Most Desired Outcome"
              sublabel="Your opening anchor. Start here and concede only if needed."
              value={`${scenario.currency} ${myBrief.mdoValue} / ${scenario.unit}`}
              highlight
            />
            <BriefItem
              label="LDO — Least Desirable Outcome"
              sublabel="Your hard walk-away point. Never accept worse than this."
              value={`${scenario.currency} ${myBrief.ldoValue} / ${scenario.unit}`}
              danger
            />
            {myBrief.batna && (
              <BriefItem
                label="BATNA — Best Alternative to a Negotiated Agreement"
                sublabel="What you do if no deal is reached. Knowing this keeps you strong."
                value={myBrief.batna}
              />
            )}
            {myBrief.priorities && <BriefItem label="Priorities" value={myBrief.priorities} />}
            {myBrief.constraints && <BriefItem label="Know this" value={myBrief.constraints} />}
          </>
        )}
        {/* Player name */}
        {!isAiVsAi && (
          <div>
            <p className="text-xs text-slate-500">Player</p>
            <p className="text-sm text-white font-medium mt-0.5">{playerName}</p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-500">Rounds: <span className="text-white">{rounds}</span></p>
          <p className="text-xs text-slate-500 mt-1">Difficulty: <span className="text-white capitalize">{scenario.difficulty}</span></p>
        </div>

        {/* Countdown timer — always shown so admin can verify the value was set */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">⏱ Time limit</span>
            {timeLimitSec > 0 ? (
              <span className={`font-mono font-semibold ${timeLeft < 60 ? "text-red-400 animate-pulse" : timeLeft < 120 ? "text-amber-400" : "text-white"}`}>
                {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
              </span>
            ) : (
              <span className="text-slate-500 italic">No limit</span>
            )}
          </div>
          {timeLimitSec > 0 && (
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${timeLeft < 60 ? "bg-red-500" : timeLeft < 120 ? "bg-amber-500" : "bg-indigo-500"}`}
                style={{ width: `${(timeLeft / timeLimitSec) * 100}%` }}
              />
            </div>
          )}
        </div>
        {isAiVsAi && aiVsAiRunning && (
          <button onClick={stopAiVsAi} className="w-full bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-400 text-sm rounded-lg py-2 transition-colors">
            Stop Demo
          </button>
        )}
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} humanRole={humanRole} isAiVsAi={isAiVsAi} scenario={scenario} />
          ))}
          {(isLoading || streamingText) && (
            <Bubble
              msg={{
                role: isAiVsAi ? (messages.length % 2 === 0 ? "buyer" : "seller") : aiRole,
                content: streamingText || "...",
              }}
              humanRole={humanRole}
              isAiVsAi={isAiVsAi}
              scenario={scenario}
              streaming={!streamingText}
            />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        {!isAiVsAi && phase === "play" && (
          <div className="border-t border-slate-800 p-4 space-y-3">
            <div className="flex gap-2">
              {/* Mic button */}
              <button
                onClick={toggleVoice}
                disabled={isLoading}
                title={isListening ? "Stop recording" : "Speak your message"}
                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-600 hover:bg-red-500 animate-pulse"
                    : "bg-slate-700 hover:bg-slate-600"
                } disabled:opacity-40`}
              >
                <MicIcon listening={isListening} />
              </button>
              <input
                className={`flex-1 bg-slate-800 border ${isListening ? "border-red-500" : "border-slate-700 focus:border-indigo-500"} text-slate-100 placeholder:text-slate-600 rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
                placeholder={isListening ? "Listening… speak now" : "Type or speak your message…"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !inputText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 rounded-xl font-medium text-sm transition-colors"
              >
                Send
              </button>
            </div>
            {voiceError && (
              <p className="text-xs text-red-400">{voiceError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setPhase("deal-modal")}
                disabled={isLoading || messages.length < 2}
                className="flex-1 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-600 text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm py-2 rounded-lg transition-colors"
              >
                Accept Deal
              </button>
              <button
                onClick={walkAway}
                disabled={isLoading}
                className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm py-2 rounded-lg transition-colors"
              >
                Walk Away
              </button>
            </div>
          </div>
        )}

        {/* Deal confirmation */}
        {phase === "deal-modal" && (
          <div className="border-t border-slate-800 bg-slate-900 p-5 space-y-3">
            <p className="text-sm font-semibold text-emerald-400">Confirm the agreed terms</p>
            <input
              className="w-full bg-slate-800 border border-emerald-600 text-slate-100 placeholder:text-slate-600 rounded-xl px-4 py-3 text-sm outline-none"
              placeholder={`e.g. ${scenario.currency} 4.20 / ${scenario.unit}, Net 45, 8-week lead time`}
              value={dealInput}
              onChange={(e) => setDealInput(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={confirmDeal} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                Confirm Deal
              </button>
              <button onClick={() => setPhase("play")} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: Coach + Live Score ── */}
      {!isAiVsAi && (
        <aside className={`shrink-0 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col transition-all duration-300 ${coachVisible ? "w-full md:w-80" : "w-full md:w-12"}`}>
          {/* Tab bar */}
          <div className="flex border-b border-slate-800 shrink-0 items-center">
            {coachVisible && (
              <>
                <button
                  onClick={() => setRightTab("coach")}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${rightTab === "coach" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-500 hover:text-slate-300"}`}
                >
                  AI Coach
                </button>
                <button
                  onClick={() => setRightTab("score")}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${rightTab === "score" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Live Score
                </button>
              </>
            )}
            <button
              onClick={() => setCoachVisible((v) => !v)}
              title={coachVisible ? "Hide coach panel" : "Show coach panel"}
              className="shrink-0 px-3 py-3 text-slate-500 hover:text-white transition-colors text-sm"
            >
              {coachVisible ? "→" : "←"}
            </button>
          </div>

          {!coachVisible && (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-slate-600 text-xs [writing-mode:vertical-rl] rotate-180 tracking-widest uppercase select-none">AI Coach</span>
            </div>
          )}

          {coachVisible && <div className="flex-1 overflow-y-auto p-4">
            {coachLoading && !coachData && (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
                </div>
                Analysing…
              </div>
            )}

            {!coachData && !coachLoading && (
              <p className="text-slate-600 text-sm text-center py-8">
                Coach will appear after the first exchange.
              </p>
            )}

            {coachData && rightTab === "coach" && (
              <div className="space-y-4">
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1.5">Next Move</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{coachData.tip}</p>
                </div>
                {coachData.alert && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-1.5">Watch Out</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{coachData.alert}</p>
                  </div>
                )}
                {coachData.nextMoves?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Try This</p>
                    <div className="space-y-2">
                      {coachData.nextMoves.map((m, i) => (
                        <div key={i} className="flex gap-2 text-sm text-slate-400">
                          <span className="text-indigo-500 shrink-0">→</span>{m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {coachData.detectedTactics?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Tactics Used</p>
                    <div className="flex flex-wrap gap-1.5">
                      {coachData.detectedTactics.map((t, i) => (
                        <span key={i} className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {coachLoading && <p className="text-xs text-slate-600 italic">Updating…</p>}
              </div>
            )}

            {coachData && rightTab === "score" && (

              <div className="space-y-5">
                <div className="text-center py-4">
                  <p className={`text-6xl font-black ${coachData.liveScore.overall >= 70 ? "text-emerald-400" : coachData.liveScore.overall >= 45 ? "text-amber-400" : "text-red-400"}`}>
                    {coachData.liveScore.overall}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Live Score</p>
                  {coachLoading && <p className="text-xs text-slate-600 mt-1">Updating…</p>}
                </div>
                <div className="space-y-3">
                  <LiveBar label="Position" value={coachData.liveScore.position} max={40} color="indigo" />
                  <LiveBar label="Tactics"  value={coachData.liveScore.tactics}  max={30} color="violet" />
                  <LiveBar label="Process"  value={coachData.liveScore.process}  max={30} color="sky" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
                  <p className="text-slate-300 font-medium text-xs uppercase tracking-widest mb-2">Score Guide</p>
                  <p><span className="text-indigo-400">Position /40</span> — how close your offer is to your MDO</p>
                  <p><span className="text-violet-400">Tactics /30</span> — anchoring, bundling, concession quality</p>
                  <p><span className="text-sky-400">Process /30</span> — probing, pacing, information management</p>
                </div>
              </div>
            )}
          </div>}
        </aside>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function RoleCard({ title, role, color, onClick }: { title: string; role: string; color: "indigo" | "amber"; onClick: () => void }) {
  const cls = color === "indigo"
    ? "border-indigo-500/40 hover:border-indigo-500 hover:bg-indigo-500/10"
    : "border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10";
  const text = color === "indigo" ? "text-indigo-400" : "text-amber-400";
  return (
    <button onClick={onClick} className={`bg-slate-800 border ${cls} rounded-xl p-4 text-left transition-all`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${text}`}>{title}</p>
      <p className="text-sm text-white mt-1">{role}</p>
    </button>
  );
}

function Bubble({ msg, humanRole, isAiVsAi, scenario, streaming }: {
  msg: ChatMessage; humanRole: "buyer" | "seller"; isAiVsAi: boolean; scenario: Scenario; streaming?: boolean;
}) {
  const isHuman = !isAiVsAi && msg.role === humanRole;
  const clean = msg.content.replace(/\[DEAL REACHED\]|\[WALK AWAY\]/g, "").trim();
  const isDeal = msg.content.includes("[DEAL REACHED]");
  const isWalkAway = msg.content.includes("[WALK AWAY]");
  const label = msg.role === "buyer" ? scenario.buyerBrief.role : scenario.sellerBrief.role;

  return (
    <div className={`flex ${isHuman ? "justify-end" : "justify-start"} gap-3`}>
      {!isHuman && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === "buyer" ? "bg-indigo-600" : "bg-amber-600"}`}>
          {label[0]}
        </div>
      )}
      <div className={`max-w-lg space-y-1 flex flex-col ${isHuman ? "items-end" : "items-start"}`}>
        <p className="text-xs text-slate-500">{label}</p>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isHuman ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-slate-800 text-slate-100 rounded-tl-sm"} ${streaming ? "opacity-60" : ""}`}>
          {clean || "..."}
        </div>
        {isDeal && <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">Deal proposed</span>}
        {isWalkAway && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Walking away</span>}
      </div>
    </div>
  );
}

function BriefItem({ label, sublabel, value, highlight, danger }: { label: string; sublabel?: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {sublabel && <p className="text-xs text-slate-600 italic mt-0.5 leading-snug">{sublabel}</p>}
      <p className={`text-sm mt-1 ${highlight ? "text-emerald-400 font-semibold" : danger ? "text-red-400 font-semibold" : "text-slate-300"}`}>{value}</p>
    </div>
  );
}

function DebriefView({ debrief, scenario, isAiVsAi, encodedId }: { debrief: DebriefResult; scenario: Scenario; isAiVsAi: boolean; encodedId: string }) {
  const scoreColor = debrief.overallScore >= 75 ? "text-emerald-400" : debrief.overallScore >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-sm text-slate-500 uppercase tracking-widest mb-2">Negotiation Complete</p>
          <h1 className="text-2xl font-bold text-white">{scenario.title}</h1>
        </div>

        {/* Score */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
          <p className={`text-7xl font-black ${scoreColor}`}>{debrief.overallScore}</p>
          <p className="text-slate-400 text-sm mt-1">Overall Score</p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <ScorePill label="Outcome" value={debrief.outcomeScore} max={40} />
            <ScorePill label="Tactics" value={debrief.tacticsScore} max={30} />
            <ScorePill label="Process" value={debrief.processScore} max={30} />
          </div>
        </div>

        {/* Outcome */}
        <div className={`rounded-2xl p-4 border text-sm ${debrief.outcome === "deal" ? "bg-emerald-900/20 border-emerald-600 text-emerald-300" : debrief.outcome === "walk_away" ? "bg-red-900/20 border-red-700 text-red-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
          <p className="font-semibold uppercase text-xs tracking-widest opacity-70 mb-1">
            {debrief.outcome === "deal" ? "Deal Reached" : debrief.outcome === "walk_away" ? "Walk Away" : "No Deal"}
          </p>
          <p>{debrief.finalValue && `Final terms: ${debrief.finalValue}. `}{debrief.valueCapture}</p>
        </div>

        {/* Coaching */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Coach&apos;s Summary</p>
          <p className="text-slate-300 text-sm leading-relaxed">{debrief.coachingSummary}</p>
        </div>

        {/* Key moments */}
        {debrief.keyMoments?.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Key Moments</p>
            {debrief.keyMoments.map((m, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-slate-500 shrink-0">Round {m.round}</span>
                <span className="text-slate-300">{m.observation}</span>
              </div>
            ))}
          </div>
        )}

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ListCard title="Strengths" items={debrief.strengths} color="emerald" />
          <ListCard title="Areas to Improve" items={debrief.improvements} color="amber" />
        </div>

        {!isAiVsAi && (
          <div className="flex justify-center gap-3 pb-8">
            <a
              href={`/scoreboard?scenario=${encodeURIComponent(scenario.title)}&encoded=${encodedId}`}
              className="inline-block bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors"
            >
              View Scoreboard
            </a>
            <a href={`/play/${encodedId}`} className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors">
              Play Again
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ScorePill({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-white">{value}<span className="text-slate-500 font-normal">/{max}</span></p>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function LiveBar({ label, value, max, color }: { label: string; value: number; max: number; color: "indigo" | "violet" | "sky" }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = color === "indigo" ? "bg-indigo-500" : color === "violet" ? "bg-violet-500" : "bg-sky-500";
  const textColor = color === "indigo" ? "text-indigo-400" : color === "violet" ? "text-violet-400" : "text-sky-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={textColor}>{label}</span>
        <span className="text-slate-400">{value}<span className="text-slate-600">/{max}</span></span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return listening ? (
    // Stop / recording indicator
    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ) : (
    // Microphone
    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
    </svg>
  );
}

function ListCard({ title, items, color }: { title: string; items: string[]; color: "emerald" | "amber" }) {
  const dot = color === "emerald" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
      <p className="text-xs text-slate-500 uppercase tracking-widest">{title}</p>
      <ul className="space-y-2">
        {items?.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0 mt-1.5`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
