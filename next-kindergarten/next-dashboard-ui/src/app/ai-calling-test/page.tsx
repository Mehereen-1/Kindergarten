"use client";

import { useMemo, useState } from "react";

export default function AICallingTestPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [llmInput, setLlmInput] = useState("আমার সন্তান আজ স্কুলে আসেনি কেন?");
  const [ttsInput, setTtsInput] = useState("আসসালামু আলাইকুম। আমি স্কুল থেকে বলছি।");
  const [sttFile, setSttFile] = useState<File | null>(null);
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [isTestingTts, setIsTestingTts] = useState(false);
  const [isTestingStt, setIsTestingStt] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isTestingConversation, setIsTestingConversation] = useState(false);
  const [callResult, setCallResult] = useState<null | {
    success: boolean;
    callSid?: string;
    error?: string;
  }>(null);
  const [conversationResult, setConversationResult] = useState<null | {
    success: boolean;
    input?: string;
    output?: string;
    error?: string;
  }>(null);
  const [llmResult, setLlmResult] = useState<null | {
    success: boolean;
    input?: string;
    reply?: string;
    error?: string;
  }>(null);
  const [ttsResult, setTtsResult] = useState<null | {
    success: boolean;
    mode?: "play" | "say";
    audioUrl?: string;
    spokenText?: string;
    error?: string;
  }>(null);
  const [sttResult, setSttResult] = useState<null | {
    success: boolean;
    text?: string;
    filename?: string;
    error?: string;
  }>(null);

  const canStartCall = useMemo(() => phoneNumber.trim().length > 0, [phoneNumber]);

  const onStartCall = async () => {
    if (!canStartCall) return;

    setIsCalling(true);
    setCallResult(null);

    try {
      const response = await fetch("/api/startCall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const result = await response.json();
      setCallResult({
        success: response.ok && !!result.success,
        callSid: result.callSid,
        error: result.error,
      });
    } catch (error) {
      setCallResult({
        success: false,
        error: String(error),
      });
    } finally {
      setIsCalling(false);
    }
  };

  const onTestConversation = async () => {
    setIsTestingConversation(true);
    setConversationResult(null);

    try {
      const response = await fetch("/api/testConversation", {
        method: "GET",
      });
      const result = await response.json();

      setConversationResult({
        success: response.ok && !!result.success,
        input: result.input,
        output: result.output,
        error: result.error,
      });
    } catch (error) {
      setConversationResult({
        success: false,
        error: String(error),
      });
    } finally {
      setIsTestingConversation(false);
    }
  };

  const onTestLlm = async () => {
    setIsTestingLlm(true);
    setLlmResult(null);

    try {
      const response = await fetch("/api/calling/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: llmInput }),
      });

      const result = await response.json();
      setLlmResult({
        success: response.ok && !!result.success,
        input: result.input,
        reply: result.reply,
        error: result.error,
      });
    } catch (error) {
      setLlmResult({ success: false, error: String(error) });
    } finally {
      setIsTestingLlm(false);
    }
  };

  const onTestTts = async () => {
    setIsTestingTts(true);
    setTtsResult(null);

    try {
      const response = await fetch("/api/calling/test-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsInput }),
      });

      const result = await response.json();
      setTtsResult({
        success: response.ok && !!result.success,
        mode: result.mode,
        audioUrl: result.audioUrl,
        spokenText: result.spokenText,
        error: result.error,
      });
    } catch (error) {
      setTtsResult({ success: false, error: String(error) });
    } finally {
      setIsTestingTts(false);
    }
  };

  const onTestStt = async () => {
    if (!sttFile) return;

    setIsTestingStt(true);
    setSttResult(null);

    try {
      const formData = new FormData();
      formData.append("audio", sttFile);

      const response = await fetch("/api/calling/test-stt", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setSttResult({
        success: response.ok && !!result.success,
        text: result.text,
        filename: result.filename,
        error: result.error,
      });
    } catch (error) {
      setSttResult({ success: false, error: String(error) });
    } finally {
      setIsTestingStt(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900">AI Calling Test Console</h1>
          <p className="mt-2 text-slate-600">
            Test Bangla LLM reply generation and place a Twilio call using the new
            App Router APIs.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">1. LLM Test (Bangla Text -&gt; Text)</h2>
            <p className="mt-2 text-sm text-slate-600">Calls <code>/api/calling/test-llm</code>.</p>

            <textarea
              value={llmInput}
              onChange={(e) => setLlmInput(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />

            <button
              onClick={onTestLlm}
              disabled={isTestingLlm || !llmInput.trim()}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isTestingLlm ? "Testing LLM..." : "Run LLM Test"}
            </button>

            {llmResult && (
              <div className={`mt-4 rounded-lg border p-4 text-sm ${llmResult.success ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"}`}>
                {llmResult.success ? (
                  <div className="space-y-2">
                    <p><strong>Input:</strong> {llmResult.input}</p>
                    <p><strong>Reply:</strong> {llmResult.reply}</p>
                  </div>
                ) : (
                  <p><strong>Error:</strong> {llmResult.error || "Unknown error"}</p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">2. TTS Test (Bangla Text -&gt; Audio)</h2>
            <p className="mt-2 text-sm text-slate-600">Calls <code>/api/calling/test-tts</code>.</p>

            <textarea
              value={ttsInput}
              onChange={(e) => setTtsInput(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />

            <button
              onClick={onTestTts}
              disabled={isTestingTts || !ttsInput.trim()}
              className="mt-4 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {isTestingTts ? "Generating Audio..." : "Run TTS Test"}
            </button>

            {ttsResult && (
              <div className={`mt-4 rounded-lg border p-4 text-sm ${ttsResult.success ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"}`}>
                {ttsResult.success ? (
                  <div className="space-y-2">
                    <p><strong>Mode:</strong> {ttsResult.mode}</p>
                    {ttsResult.mode === "play" ? (
                      <>
                        <p><strong>Audio URL:</strong> {ttsResult.audioUrl}</p>
                        {ttsResult.audioUrl && <audio controls src={ttsResult.audioUrl} className="w-full" />}
                      </>
                    ) : (
                      <p><strong>Spoken Text (Twilio Say):</strong> {ttsResult.spokenText}</p>
                    )}
                  </div>
                ) : (
                  <p><strong>Error:</strong> {ttsResult.error || "Unknown error"}</p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">3. STT Test (Audio -&gt; Bangla Text)</h2>
            <p className="mt-2 text-sm text-slate-600">Calls <code>/api/calling/test-stt</code> with uploaded audio.</p>

            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a"
              onChange={(e) => setSttFile(e.target.files?.[0] || null)}
              className="mt-4 block w-full text-sm"
            />

            <button
              onClick={onTestStt}
              disabled={isTestingStt || !sttFile}
              className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
            >
              {isTestingStt ? "Transcribing..." : "Run STT Test"}
            </button>

            {sttResult && (
              <div className={`mt-4 rounded-lg border p-4 text-sm ${sttResult.success ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"}`}>
                {sttResult.success ? (
                  <div className="space-y-2">
                    <p><strong>File:</strong> {sttResult.filename}</p>
                    <p><strong>Transcription:</strong> {sttResult.text}</p>
                  </div>
                ) : (
                  <p><strong>Error:</strong> {sttResult.error || "Unknown error"}</p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">4. Conversation Test</h2>
            <p className="mt-2 text-sm text-slate-600">
              Calls <code>/api/testConversation</code> with the sample Bangla parent question.
            </p>

            <button
              onClick={onTestConversation}
              disabled={isTestingConversation}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isTestingConversation ? "Testing..." : "Run Conversation Test"}
            </button>

            {conversationResult && (
              <div
                className={`mt-4 rounded-lg border p-4 text-sm ${
                  conversationResult.success
                    ? "border-green-300 bg-green-50 text-green-900"
                    : "border-red-300 bg-red-50 text-red-900"
                }`}
              >
                {conversationResult.success ? (
                  <div className="space-y-2">
                    <p>
                      <strong>Input:</strong> {conversationResult.input}
                    </p>
                    <p>
                      <strong>Output:</strong> {conversationResult.output}
                    </p>
                  </div>
                ) : (
                  <p>
                    <strong>Error:</strong> {conversationResult.error || "Unknown error"}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">5. Start Real Call</h2>
            <p className="mt-2 text-sm text-slate-600">
              Calls <code>/api/startCall</code> and returns the Twilio Call SID.
            </p>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Parent Phone Number (E.164)
            </label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />

            <button
              onClick={onStartCall}
              disabled={!canStartCall || isCalling}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isCalling ? "Placing Call..." : "Start Call"}
            </button>

            {callResult && (
              <div
                className={`mt-4 rounded-lg border p-4 text-sm ${
                  callResult.success
                    ? "border-green-300 bg-green-50 text-green-900"
                    : "border-red-300 bg-red-50 text-red-900"
                }`}
              >
                {callResult.success ? (
                  <p>
                    <strong>Call SID:</strong> {callResult.callSid}
                  </p>
                ) : (
                  <p>
                    <strong>Error:</strong> {callResult.error || "Unknown error"}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p>
            <strong>Note:</strong> For full call loop testing, set <code>BASE_URL</code> to a
            publicly reachable URL (for example via ngrok) so Twilio can hit
            <code> /api/processSpeech</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
