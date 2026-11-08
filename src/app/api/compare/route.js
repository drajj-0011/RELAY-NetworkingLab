import { sanitizeConfig } from "@/lib/network-data";
import { runHeadless } from "@/lib/simulator";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const config = sanitizeConfig(body.config);
    const failedLinks = Array.isArray(body.failedLinks)
      ? [...new Set(body.failedLinks.filter((id) => typeof id === "string"))].slice(0, 40)
      : [];

    const tcp = runHeadless({ ...config, protocol: "tcp" }, failedLinks);
    const udp = runHeadless({ ...config, protocol: "udp" }, failedLinks);

    return Response.json({
      config,
      failedLinks,
      tcp: { metrics: tcp.metrics, elapsed: tcp.elapsed, capped: tcp.capped },
      udp: { metrics: udp.metrics, elapsed: udp.elapsed, capped: udp.capped },
      method:
        "Both runs execute the same topology, failed links, payload schedule, routing policy, and initial random seed. TCP retries consume additional random draws after a loss.",
    });
  } catch (error) {
    console.error("[relay-api] compare error:", error);
    return Response.json({ error: "The comparison could not be completed." }, { status: 500 });
  }
}
