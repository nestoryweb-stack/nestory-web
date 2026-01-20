export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.IMAGE_API_BASE;
const API_KEY = process.env.IMAGE_API_KEY;

export async function GET() {
  try {
    if (!API_KEY) return Response.json({ ok: false, error: "Missing IMAGE_API_KEY" }, { status: 500 });

    // Call a cheap endpoint; your /status/<id> needs an id, so just call BASE root
    const res = await fetch(`${BASE_URL}/`, {
      headers: { "X-API-Key": API_KEY },
    });

    const text = await res.text();
    return Response.json({
      ok: true,
      upstreamStatus: res.status,
      snippet: text.slice(0, 200),
    });
  } catch (e: any) {
    // This will show the real Node error message
    return Response.json(
      { ok: false, error: "fetch failed", details: String(e?.message ?? e) },
      { status: 502 }
    );
  }
}
