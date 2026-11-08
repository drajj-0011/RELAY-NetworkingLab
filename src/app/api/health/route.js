import { connectToMongo, mongoStatus } from "@/db/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  // The HTTP service is healthy even when MongoDB is absent; the database
  // state is reported separately so the reason is never hidden.
  await connectToMongo({ timeoutMs: 1500 }).catch(() => {});
  const database = mongoStatus();

  return Response.json({
    ok: true,
    service: "relay-next",
    runtime: `node ${process.version}`,
    database,
  });
}
