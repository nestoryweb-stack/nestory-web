export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.IMAGE_API_BASE || "https://mortality-packs-workforce-hearing.trycloudflare.com";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ jobId?: string }> }
) {
  try {
    const API_KEY = process.env.IMAGE_API_KEY;
    if (!API_KEY) {
      return Response.json({ ok: false, error: "Missing IMAGE_API_KEY" }, { status: 500 });
    }

    const { jobId: jobIdMaybe } = await ctx.params; // ✅ unwrap Promise
    const jobIdRaw = String(jobIdMaybe ?? "").trim();

    if (!jobIdRaw) {
      return Response.json(
        {
          ok: false,
          error: "Missing jobId",
          debug: { url: req.url },
          hint: "params is async in this Next version; we must await ctx.params",
        },
        { status: 400 }
      );
    }

    const jobIdEnc = encodeURIComponent(jobIdRaw);

    let upstream: Response;
    try {
      upstream = await fetch(`${BASE_URL}/status/${jobIdEnc}`, {
        headers: { "X-API-Key": API_KEY },
        cache: "no-store",
      });
    } catch (e: any) {
      return Response.json(
        {
          ok: false,
          error: "fetch failed",
          where: "status:upstream-fetch",
          baseUrl: BASE_URL,
          details: String(e?.cause?.message ?? e?.message ?? e),
        },
        { status: 502 }
      );
    }

    const text = await upstream.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      return Response.json(
        {
          ok: false,
          error: "Upstream returned non-JSON",
          where: "status:upstream-nonjson",
          status: upstream.status,
          snippet: text.slice(0, 400),
        },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      return Response.json(
        {
          ok: false,
          error: "Upstream status failed",
          where: "status:upstream-badstatus",
          status: upstream.status,
          details: data,
        },
        { status: 502 }
      );
    }

    const rawStatus = String(data?.status ?? "unknown").toLowerCase();
    const normalized =
      ["done", "completed", "succeeded"].includes(rawStatus) ? "done" :
      ["error", "failed"].includes(rawStatus) ? "error" :
      "running";

    return Response.json({
      ok: true,
      jobId: jobIdRaw,
      status: normalized,
      raw: data,
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: "status route crashed", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
