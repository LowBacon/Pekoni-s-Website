"use client";

import { useState } from "react";
import { mulberry32, seedFrom } from "@/components/env/scenes";

/**
 * Minecraft player head.
 *
 * Rendered from the public head service when a Minecraft name is linked. If the
 * request fails — offline, rate limited, unknown name — we fall back to a
 * deterministic voxel portrait generated from the username, so the layout never
 * collapses and nobody sees a broken image.
 */

type Props = {
  username: string;
  minecraftUsername?: string | null;
  size?: number;
  className?: string;
  /** Adds a subtle rim so heads read against busy artwork. */
  ring?: boolean;
};

const PALETTES = [
  ["#91b65d", "#5c7a3a"],
  ["#7fa9b5", "#4b6e78"],
  ["#e9af53", "#a97a2f"],
  ["#9b8ac8", "#665a8c"],
  ["#55c98b", "#347d57"],
  ["#d96962", "#8f4340"],
];

function VoxelPortrait({ name, size }: { name: string; size: number }) {
  const rand = mulberry32(seedFrom(name.toLowerCase()));
  const [light, dark] = PALETTES[Math.floor(rand() * PALETTES.length)];
  const cells = [];
  const grid = 8;

  // Mirrored across the vertical axis so the result reads as a face.
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid / 2; x += 1) {
      const filled = rand() > (y < 2 || y > 6 ? 0.62 : 0.36);
      if (!filled) continue;
      const shade = rand() > 0.62 ? light : dark;
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={shade} />);
      cells.push(
        <rect key={`m${x}-${y}`} x={grid - 1 - x} y={y} width={1} height={1} fill={shade} />,
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${grid} ${grid}`} width={size} height={size} aria-hidden="true">
      <rect width={grid} height={grid} fill="#151c15" />
      {cells}
    </svg>
  );
}

export default function Avatar({
  username,
  minecraftUsername,
  size = 40,
  className = "",
  ring = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const name = minecraftUsername || username;
  const pixels = Math.min(256, Math.max(32, Math.round(size * 2)));

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-[6px] bg-[var(--color-ink-800)] ${
        ring ? "ring-1 ring-[var(--line-strong)]" : ""
      } ${className}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    >
      {failed ? (
        <VoxelPortrait name={name} size={size} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/${pixels}`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </span>
  );
}
