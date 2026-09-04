import { z } from "zod";
import { prisma } from "@/server/db";
import { requireUser, USERNAME_PATTERN } from "@/server/auth";
import { randomSeed, hashSeed } from "@/server/rng";
import { handleError, LIMITS, ok, parseBody, requireRate } from "@/server/api";

const schema = z.object({
  soundEnabled: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  publicActivity: z.boolean().optional(),
  minecraftUsername: z
    .string()
    .trim()
    .regex(USERNAME_PATTERN, "Minecraft-nimi: 3–16 merkkiä.")
    .nullable()
    .optional(),
  clientSeed: z.string().trim().min(4).max(64).optional(),
  rotateServerSeed: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    requireRate(`settings:${user.id}`, LIMITS.write);
    const input = await parseBody(request, schema);

    const data: Record<string, unknown> = {};
    if (input.soundEnabled !== undefined) data.soundEnabled = input.soundEnabled;
    if (input.reducedMotion !== undefined) data.reducedMotion = input.reducedMotion;
    if (input.publicActivity !== undefined) data.publicActivity = input.publicActivity;
    if (input.minecraftUsername !== undefined) data.minecraftUsername = input.minecraftUsername;
    if (input.clientSeed !== undefined) data.clientSeed = input.clientSeed;

    let revealedSeed: string | null = null;
    if (input.rotateServerSeed) {
      // Rotating reveals the retired seed, so every past round stays verifiable.
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { serverSeed: true },
      });
      revealedSeed = current.serverSeed;
      const next = randomSeed();
      data.serverSeed = next;
      data.serverSeedHash = hashSeed(next);
      data.nonce = 0;
    }

    const settings = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        soundEnabled: true,
        reducedMotion: true,
        publicActivity: true,
        minecraftUsername: true,
        clientSeed: true,
        serverSeedHash: true,
        nonce: true,
      },
    });

    return ok({ settings, revealedSeed });
  } catch (error) {
    return handleError(error);
  }
}
