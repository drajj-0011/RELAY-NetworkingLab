import { isApiError } from "@/lib/apiError";
import { createExperiment, deleteExperiment, listExperiments } from "@/db/experimentStore";

export const dynamic = "force-dynamic";

function fail(error) {
  const status = isApiError(error) ? error.status : 500;
  const body = { error: isApiError(error) ? error.message : "Unexpected server error." };
  if (isApiError(error) && error.details) body.details = error.details;
  if (!isApiError(error)) console.error("[relay-api] experiments error:", error);
  return Response.json(body, { status });
}

export async function GET(request) {
  try {
    const limit = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 16));
    const experiments = await listExperiments(limit);
    return Response.json({ count: experiments.length, experiments });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const experiment = await createExperiment(body);
    return Response.json({ experiment }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    const result = await deleteExperiment(id);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return fail(error);
  }
}
