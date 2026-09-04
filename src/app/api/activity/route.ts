import { getActivityFeed } from "@/server/queries";
import { handleError, ok } from "@/server/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const requested = Number(new URL(request.url).searchParams.get("limit") ?? 12);
    const limit = Math.min(30, Number.isFinite(requested) && requested > 0 ? requested : 12);
    const feed = await getActivityFeed(limit);
    return ok({ feed }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleError(error);
  }
}
