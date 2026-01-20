export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.IMAGE_API_BASE;

export async function POST(req: Request) {
  try {
    const API_KEY = process.env.IMAGE_API_KEY;

    // Always return JSON
    if (!API_KEY) {
      return Response.json(
        {
          ok: false,
          where: "submit:env",
          error: "Missing IMAGE_API_KEY (server did not load env vars)",
        },
        { status: 500 }
      );
    }

    const raw = await req.text();
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return Response.json(
        { ok: false, where: "submit:body", error: "Invalid JSON body", raw: raw.slice(0, 200) },
        { status: 400 }
      );
    }

    const prompt = String(body?.prompt ?? "").trim();
    const steps = Number.isFinite(Number(body?.steps)) ? Number(body.steps) : 10;

    if (!prompt) {
      return Response.json({ ok: false, where: "submit:validate", error: "Missing prompt" }, { status: 400 });
    }

    // Upstream call
    const upstream = await fetch(`${BASE_URL}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ prompt, steps }),
    });

    const upstreamText = await upstream.text();

    // If upstream gives HTML (Cloudflare timeout etc.), surface it
    let upstreamJson: any = null;
    try {
      upstreamJson = JSON.parse(upstreamText);
    } catch {
      return Response.json(
        {
          ok: false,
          where: "submit:upstream-nonjson",
          status: upstream.status,
          snippet: upstreamText.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      return Response.json(
        {
          ok: false,
          where: "submit:upstream-badstatus",
          status: upstream.status,
          details: upstreamJson,
        },
        { status: 502 }
      );
    }

    if (!upstreamJson?.job_id) {
      return Response.json(
        { ok: false, where: "submit:missing-jobid", details: upstreamJson },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, jobId: upstreamJson.job_id });
  } catch (e: any) {
    // This guarantees JSON even on crashes
    return Response.json(
      { ok: false, where: "submit:catch", error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
