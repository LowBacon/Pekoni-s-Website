import { z } from "zod";
import { requireUser } from "@/server/auth";
import { handleError, LIMITS, ok, parseBody, requireRate } from "@/server/api";
import { openCase } from "@/server/cases";

const schema = z.object({
  caseId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(64).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireRate(`case-open:${user.id}`, LIMITS.game);

    const input = await parseBody(request, schema);
    const result = await openCase({
      userId: user.id,
      caseId: input.caseId,
      idempotencyKey: input.idempotencyKey,
    });

    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
