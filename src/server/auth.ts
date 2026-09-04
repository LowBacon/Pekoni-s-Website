import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";
import { randomSeed, hashSeed } from "./rng";
import { hasRole, type Role } from "@/lib/enums";

export const SESSION_COOKIE = "pekoni_session";
const SESSION_TTL_DAYS = 30;

// --- password hashing ------------------------------------------------------
// scrypt from node:crypto — no native build step, memory-hard, and the cost
// parameters are stored alongside the hash so they can be raised later.

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LEN = 64;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LEN,
      { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: 64 * 1024 * 1024 },
      (err, derived) => (err ? reject(err) : resolve(derived)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(
        password.normalize("NFKC"),
        salt,
        expected.length,
        { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 },
        (err, out) => (err ? reject(err) : resolve(out)),
      );
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// --- sessions --------------------------------------------------------------

function secret(): string {
  const value = process.env.PEKONI_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PEKONI_SECRET must be set to at least 32 characters in production");
    }
    return "pekoni-development-secret-fallback-value-0000";
  }
  return value;
}

/** The raw token lives only in the cookie; the database stores an HMAC of it. */
function tokenHash(token: string): string {
  return crypto.createHmac("sha256", secret()).update(token).digest("hex");
}

export async function createSession(userId: string, userAgent?: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      userAgent: userAgent?.slice(0, 255),
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: tokenHash(token) } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  status: string;
  level: number;
  xp: number;
  balance: number;
  minecraftUsername: string | null;
  soundEnabled: boolean;
  reducedMotion: boolean;
  publicActivity: boolean;
  serverSeedHash: string;
  clientSeed: string;
  createdAt: Date;
};

/**
 * Deduped per request. Returns null for anonymous visitors and for suspended
 * accounts — a suspended user can read nothing and spend nothing.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { include: { wallet: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  const user = session.user;
  if (user.status === "SUSPENDED") {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      level: user.level,
      xp: user.xp,
      balance: user.wallet?.balance ?? 0,
      minecraftUsername: user.minecraftUsername,
      soundEnabled: user.soundEnabled,
      reducedMotion: user.reducedMotion,
      publicActivity: user.publicActivity,
      serverSeedHash: user.serverSeedHash,
      clientSeed: user.clientSeed,
      createdAt: user.createdAt,
    };
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    level: user.level,
    xp: user.xp,
    balance: user.wallet?.balance ?? 0,
    minecraftUsername: user.minecraftUsername,
    soundEnabled: user.soundEnabled,
    reducedMotion: user.reducedMotion,
    publicActivity: user.publicActivity,
    serverSeedHash: user.serverSeedHash,
    clientSeed: user.clientSeed,
    createdAt: user.createdAt,
  };
});

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Throws unless a healthy, active session exists. Use in every mutating route. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Kirjaudu sisään jatkaaksesi.", 401);
  if (user.status === "SUSPENDED") {
    throw new AuthError("Tilisi on jäädytetty. Ota yhteyttä ylläpitoon.", 403);
  }
  return user;
}

/**
 * Server-side authorisation. Frontend visibility is never the control — every
 * admin API route calls this.
 */
export async function requireRole(atLeast: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user.role, atLeast)) {
    throw new AuthError("Ei käyttöoikeutta.", 403);
  }
  return user;
}

// --- account creation ------------------------------------------------------

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

export async function createUser(input: {
  username: string;
  password: string;
  email?: string | null;
  minecraftUsername?: string | null;
}) {
  const serverSeed = randomSeed();
  const passwordHash = await hashPassword(input.password);
  const ownerName = process.env.PEKONI_OWNER_USERNAME?.trim().toLowerCase();
  const isOwner = !!ownerName && ownerName === input.username.toLowerCase();

  return prisma.user.create({
    data: {
      username: input.username,
      usernameLower: input.username.toLowerCase(),
      email: input.email || null,
      passwordHash,
      minecraftUsername: input.minecraftUsername || input.username,
      role: isOwner ? "OWNER" : "USER",
      serverSeed,
      serverSeedHash: hashSeed(serverSeed),
      clientSeed: randomSeed(8),
      wallet: { create: { balance: 1_000 } },
      stats: { create: {} },
    },
    include: { wallet: true },
  });
}
