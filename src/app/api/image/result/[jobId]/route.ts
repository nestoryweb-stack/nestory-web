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
        { ok: false, error: "Missing jobId !!", debug: { url: req.url } },
        { status: 400 }
      );
    }

    const jobIdEnc = encodeURIComponent(jobIdRaw);

    let upstream: Response;
    try {
      upstream = await fetch(`${BASE_URL}/result/${jobIdEnc}`, {
        headers: { "X-API-Key": API_KEY },
        cache: "no-store",
      });
    } catch (e: any) {
      return Response.json(
        {
          ok: false,
          error: "fetch failed",
          where: "result:upstream-fetch",
          baseUrl: BASE_URL,
          details: String(e?.cause?.message ?? e?.message ?? e),
        },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          error: "Upstream result failed",
          where: "result:upstream-badstatus",
          status: upstream.status,
          snippet: text.slice(0, 400),
        },
        { status: 502 }
      );
    }

    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: "result route crashed", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
