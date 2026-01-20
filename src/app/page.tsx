"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "idle" | "submitting" | "running" | "downloading" | "done" | "error";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function prettyError(e: unknown) {
  if (e instanceof Error) return e.message;
  return String(e);
}

export default function Page() {
  const [prompt, setPrompt] = useState("a cute superhero child");
  const [steps, setSteps] = useState(10);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const startedAtRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const smoothTimerRef = useRef<number | null>(null);

  const canGenerate = useMemo(() => {
    return phase === "idle" || phase === "done" || phase === "error";
  }, [phase]);

  function cleanupObjectUrl() {
    setImgUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function stopTimers() {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    if (smoothTimerRef.current) window.clearInterval(smoothTimerRef.current);
    pollTimerRef.current = null;
    smoothTimerRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopTimers();
      cleanupObjectUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case "idle":
        return "Ready";
      case "submitting":
        return "Submitting job…";
      case "running":
        return "Generating…";
      case "downloading":
        return "Downloading image…";
      case "done":
        return "Done";
      case "error":
        return "Error";
    }
  }, [phase]);

  // Smooth progress “animation” while running (doesn't lie too much)
  function startSmoothProgress() {
    startedAtRef.current = Date.now();
    smoothTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        // target curve: grows fast to ~70, then slows to ~92 while waiting
        const t = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : 0;
        const target =
          t < 8 ? 10 + t * 8 : // 10..74 in ~8s
          t < 25 ? 74 + (t - 8) * 1.0 : // 74..91 in ~17s
          92; // cap until done

        const next = p + (target - p) * 0.12; // ease
        return clamp(next, 0, 92);
      });
    }, 200);
  }

  async function generate() {
    setError("");
    cleanupObjectUrl();
    stopTimers();

    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError("Please enter a prompt.");
      setPhase("error");
      return;
    }

    setPhase("submitting");
    setProgress(5);
    setJobId(null);

    try {
      // 1) submit
      const submitRes = await fetch("/api/image/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt, steps }),
      });

      const submitText = await submitRes.text();
      let submitData: any;
      try {
        submitData = JSON.parse(submitText);
      } catch {
        throw new Error(`Submit returned non-JSON (${submitRes.status}): ${submitText.slice(0, 200)}`);
      }

      if (!submitRes.ok) {
        throw new Error(submitData?.error || `Submit failed (${submitRes.status})`);
      }

      const newJobId = submitData.jobId as string;
      if (!newJobId) throw new Error("Missing jobId from submit");

      setJobId(newJobId);
      setPhase("running");
      setProgress(12);

      // 2) start smooth progress + poll status
      startSmoothProgress();

      pollTimerRef.current = window.setInterval(async () => {
        try {
          const sRes = await fetch(`/api/image/status/${newJobId}`, { cache: "no-store" });
          const sText = await sRes.text();
          let sData: any;
          try {
            sData = JSON.parse(sText);
          } catch {
            throw new Error(`Status returned non-JSON (${sRes.status}): ${sText.slice(0, 200)}`);
          }

          if (!sRes.ok) throw new Error(sData?.error || `Status failed (${sRes.status})`);

          if (sData.status === "error") {
            stopTimers();
            setPhase("error");
            setProgress(0);
            setError("Generation failed (upstream returned error).");
            return;
          }

          if (sData.status === "done") {
            // 3) fetch image
            stopTimers();
            setPhase("downloading");
            setProgress(95);

            const imgRes = await fetch(`/api/image/result/${newJobId}`, { cache: "no-store" });
            const ct = imgRes.headers.get("content-type") || "";

            if (!imgRes.ok || !ct.includes("image/png")) {
              const t = await imgRes.text().catch(() => "");
              throw new Error(`Result failed (${imgRes.status}): ${t.slice(0, 250)}`);
            }

            const blob = await imgRes.blob();
            const url = URL.createObjectURL(blob);

            setImgUrl(url);
            setPhase("done");
            setProgress(100);
          }
        } catch (e) {
          stopTimers();
          setPhase("error");
          setProgress(0);
          setError(prettyError(e));
        }
      }, 1200);

      // safety timeout ~90s
      window.setTimeout(() => {
        if (phase === "running" || phase === "submitting") {
          // best-effort timeout; doesn't kill upstream job, just UI
          stopTimers();
          setPhase("error");
          setProgress(0);
          setError("Timed out waiting for image. Try again.");
        }
      }, 90000);

    } catch (e) {
      stopTimers();
      setPhase("error");
      setProgress(0);
      setError(prettyError(e));
    }
  }

  function reset() {
    stopTimers();
    cleanupObjectUrl();
    setJobId(null);
    setError("");
    setPhase("idle");
    setProgress(0);
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center bg-gray-50">
      <div className="w-full max-w-3xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Nestory — Image Generator</h1>
          <p className="text-sm text-gray-600">
            Send a prompt → create an image (server-side key, progress, retry).
          </p>
        </header>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_140px]">
            <div className="space-y-1">
              <label className="text-sm font-medium">Prompt</label>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="a cute superhero child"
                disabled={!canGenerate && phase !== "done" && phase !== "error"}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Steps</label>
              <input
                type="number"
                min={1}
                max={50}
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                disabled={!canGenerate && phase !== "done" && phase !== "error"}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-60"
            >
              {phase === "idle" || phase === "done" || phase === "error" ? "Generate" : "Working…"}
            </button>

            <button
              onClick={reset}
              className="rounded-xl border px-4 py-2"
            >
              Reset
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">{phaseLabel}</div>
              <div className="text-gray-600">{Math.round(progress)}%</div>
            </div>

            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden border">
              <div
                className="h-full rounded-full bg-black transition-[width] duration-300"
                style={{ width: `${clamp(progress, 0, 100)}%` }}
              />
            </div>

            {jobId && (
              <div className="text-xs text-gray-600">
                Job ID: <span className="font-mono">{jobId}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium mb-3">Result</div>
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt="generated"
              className="w-full rounded-xl border"
            />
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
              No image yet. Enter a prompt and click <b>Generate</b>.
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Tip: if generation keeps timing out, your Cloudflare tunnel may be unstable (524/502). The UI will now show the actual upstream error.
        </div>
      </div>
    </main>
  );
}
