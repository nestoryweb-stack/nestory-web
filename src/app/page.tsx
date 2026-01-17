"use client";

import { useState } from "react";

const TOPICS = [
  { key: "space", title: "הרפתקה בחלל" },
  { key: "ocean", title: "מסע בים" },
  { key: "jungle", title: "ג׳ונגל מסתורי" },
] as const;

export default function Home() {
  const [child, setChild] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["key"]>("space");
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<string>("");
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function generate() {
    setLoading(true);
    setError("");
    setStory("");
    setTopicTitle("");

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child, topic }),
      });

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); }
      catch { throw new Error(`Server returned non-JSON:\n${text.slice(0,200)}`); }
      if (!res.ok) throw new Error(data?.error || "שגיאה לא ידועה");

      if (!res.ok) throw new Error(data?.error || "שגיאה לא ידועה");

      setTopicTitle(data.topicTitle);
      setStory(data.story);
    } catch (e: any) {
      setError(e.message || "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Nestory3</h1>
        <p className="text-sm text-gray-600">
          מכניסים שם + בוחרים נושא → מקבלים סיפור מותאם.
        </p>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">שם הילד/ה</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={child}
              onChange={(e) => setChild(e.target.value)}
              placeholder="לדוגמה: נועם"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">נושא</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value as any)}
            >
              {TOPICS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full rounded-xl bg-black text-white py-2 disabled:opacity-60"
          >
            {loading ? "מייצר..." : "צור סיפור"}
          </button>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        {(topicTitle || story) && (
          <div className="rounded-2xl border p-4 space-y-2">
            {topicTitle && <div className="font-semibold">{topicTitle}</div>}
            <div className="whitespace-pre-wrap leading-7">{story}</div>
          </div>
        )}
      </div>
    </main>
  );
}
