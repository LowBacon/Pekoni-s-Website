/**
 * Scene definitions for the Pekoni world.
 *
 * Every location is drawn from the same primitive vocabulary — sky, ridgelines,
 * voxel formations, pines, fog bands, a light source — but each gets its own
 * palette and composition so no two pages share a backdrop. All artwork is
 * generated vector geometry; nothing here is traced from another game.
 */

export type SceneKey =
  | "wilderness"
  | "minebet"
  | "mine"
  | "altar"
  | "mountain"
  | "cavern"
  | "ruins"
  | "shrine"
  | "vault"
  | "arena"
  | "hall"
  | "lodge"
  | "command"
  | "clearing"
  | "library";

export type ScenePalette = {
  /** Sky gradient, top → horizon. */
  sky: [string, string, string];
  /** Ridge layers, far → near. */
  ridges: string[];
  /** Foreground silhouette. */
  fore: string;
  /** Light source colour. */
  light: string;
  /** Ambient fog tint. */
  fog: string;
  /** Accent used by glows and particles. */
  accent: string;
};

export type SceneSpec = {
  palette: ScenePalette;
  /** Vertical position of the horizon, 0–1 of the viewBox height. */
  horizon: number;
  /** Where the key light sits, 0–1 across the frame. */
  lightX: number;
  lightY: number;
  /** Structural motif layered over the ridges. */
  motif: "pines" | "voxels" | "columns" | "arches" | "crystals" | "none";
  motifDensity: number;
  /** Falling/floating particle character. */
  particles: "dust" | "embers" | "snow" | "spores" | "sparks" | "none";
  /** Light shafts through the fog. */
  shafts: number;
};

export const SCENES: Record<SceneKey, SceneSpec> = {
  wilderness: {
    palette: {
      sky: ["#0a1410", "#0d1b16", "#122019"],
      ridges: ["#101a15", "#0d1712", "#0a130f"],
      fore: "#060b08",
      light: "#b1d875",
      fog: "#7fa9b5",
      accent: "#91b65d",
    },
    horizon: 0.62,
    lightX: 0.72,
    lightY: 0.26,
    motif: "pines",
    motifDensity: 1,
    particles: "spores",
    shafts: 3,
  },
  minebet: {
    palette: {
      sky: ["#0a0f14", "#0d151a", "#111c1d"],
      ridges: ["#101a1c", "#0d1618", "#0a1113"],
      fore: "#06090b",
      light: "#7fa9b5",
      fog: "#9dc3cd",
      accent: "#55c98b",
    },
    horizon: 0.66,
    lightX: 0.3,
    lightY: 0.22,
    motif: "voxels",
    motifDensity: 0.8,
    particles: "dust",
    shafts: 2,
  },
  mine: {
    palette: {
      sky: ["#0d0a08", "#140f0a", "#1a130c"],
      ridges: ["#181109", "#130d07", "#0d0906"],
      fore: "#080605",
      light: "#e9af53",
      fog: "#c88f3d",
      accent: "#f2c66d",
    },
    horizon: 0.7,
    lightX: 0.5,
    lightY: 0.4,
    motif: "columns",
    motifDensity: 0.9,
    particles: "embers",
    shafts: 4,
  },
  altar: {
    palette: {
      sky: ["#0a0d12", "#0e1218", "#12181d"],
      ridges: ["#121820", "#0e1319", "#0a0e13"],
      fore: "#070a0d",
      light: "#9b8ac8",
      fog: "#7fa9b5",
      accent: "#b3a4de",
    },
    horizon: 0.68,
    lightX: 0.5,
    lightY: 0.3,
    motif: "arches",
    motifDensity: 0.7,
    particles: "dust",
    shafts: 3,
  },
  mountain: {
    palette: {
      sky: ["#080d13", "#0c141c", "#122029"],
      ridges: ["#152430", "#101b24", "#0b1218"],
      fore: "#060a0d",
      light: "#9dc3cd",
      fog: "#7fa9b5",
      accent: "#55c98b",
    },
    horizon: 0.74,
    lightX: 0.22,
    lightY: 0.2,
    motif: "voxels",
    motifDensity: 0.5,
    particles: "snow",
    shafts: 2,
  },
  cavern: {
    palette: {
      sky: ["#06100d", "#081714", "#0b1e19"],
      ridges: ["#0c1c18", "#091612", "#06100d"],
      fore: "#040a08",
      light: "#55c98b",
      fog: "#79dca7",
      accent: "#55c98b",
    },
    horizon: 0.72,
    lightX: 0.5,
    lightY: 0.52,
    motif: "crystals",
    motifDensity: 1.1,
    particles: "sparks",
    shafts: 3,
  },
  ruins: {
    palette: {
      sky: ["#080e0a", "#0b140e", "#101a13"],
      ridges: ["#121b14", "#0d150f", "#090f0b"],
      fore: "#050907",
      light: "#91b65d",
      fog: "#74954a",
      accent: "#b1d875",
    },
    horizon: 0.68,
    lightX: 0.78,
    lightY: 0.3,
    motif: "columns",
    motifDensity: 1,
    particles: "spores",
    shafts: 3,
  },
  shrine: {
    palette: {
      sky: ["#07090f", "#0a0d15", "#0e131c"],
      ridges: ["#101622", "#0b1019", "#070a10"],
      fore: "#04060a",
      light: "#f2c66d",
      fog: "#9b8ac8",
      accent: "#e9af53",
    },
    horizon: 0.76,
    lightX: 0.5,
    lightY: 0.44,
    motif: "arches",
    motifDensity: 0.9,
    particles: "sparks",
    shafts: 5,
  },
  vault: {
    palette: {
      sky: ["#0b0d09", "#10130c", "#161a10"],
      ridges: ["#171b12", "#12160e", "#0c0f09"],
      fore: "#070805",
      light: "#f2c66d",
      fog: "#e9af53",
      accent: "#f2c66d",
    },
    horizon: 0.74,
    lightX: 0.5,
    lightY: 0.36,
    motif: "voxels",
    motifDensity: 0.7,
    particles: "dust",
    shafts: 3,
  },
  arena: {
    palette: {
      sky: ["#0b0a10", "#0f0e16", "#14131d"],
      ridges: ["#16151f", "#100f18", "#0a0910"],
      fore: "#060509",
      light: "#9b8ac8",
      fog: "#b3a4de",
      accent: "#9b8ac8",
    },
    horizon: 0.7,
    lightX: 0.5,
    lightY: 0.26,
    motif: "columns",
    motifDensity: 0.6,
    particles: "sparks",
    shafts: 4,
  },
  hall: {
    palette: {
      sky: ["#0d0b06", "#131009", "#1a160d"],
      ridges: ["#1b1710", "#15120b", "#0e0c07"],
      fore: "#080604",
      light: "#f2c66d",
      fog: "#e9af53",
      accent: "#f2c66d",
    },
    horizon: 0.72,
    lightX: 0.5,
    lightY: 0.24,
    motif: "columns",
    motifDensity: 0.8,
    particles: "dust",
    shafts: 5,
  },
  lodge: {
    palette: {
      sky: ["#0c0e09", "#11150d", "#171c12"],
      ridges: ["#161c12", "#11160e", "#0b0f09"],
      fore: "#070905",
      light: "#e9af53",
      fog: "#91b65d",
      accent: "#91b65d",
    },
    horizon: 0.66,
    lightX: 0.66,
    lightY: 0.32,
    motif: "pines",
    motifDensity: 0.8,
    particles: "embers",
    shafts: 2,
  },
  command: {
    palette: {
      sky: ["#080b0c", "#0b1012", "#0e1618"],
      ridges: ["#101718", "#0c1213", "#080d0e"],
      fore: "#050809",
      light: "#7fa9b5",
      fog: "#9dc3cd",
      accent: "#7fa9b5",
    },
    horizon: 0.78,
    lightX: 0.5,
    lightY: 0.18,
    motif: "none",
    motifDensity: 0,
    particles: "none",
    shafts: 1,
  },
  clearing: {
    palette: {
      sky: ["#090f0b", "#0c150f", "#111c14"],
      ridges: ["#121d15", "#0e1710", "#0a110c"],
      fore: "#050907",
      light: "#b1d875",
      fog: "#91b65d",
      accent: "#e9af53",
    },
    horizon: 0.64,
    lightX: 0.5,
    lightY: 0.3,
    motif: "pines",
    motifDensity: 1.2,
    particles: "spores",
    shafts: 4,
  },
  library: {
    palette: {
      sky: ["#0a0c10", "#0e1116", "#12171c"],
      ridges: ["#131820", "#0f1319", "#0a0d12"],
      fore: "#06080b",
      light: "#9dc3cd",
      fog: "#7fa9b5",
      accent: "#7fa9b5",
    },
    horizon: 0.72,
    lightX: 0.34,
    lightY: 0.24,
    motif: "arches",
    motifDensity: 0.5,
    particles: "dust",
    shafts: 2,
  },
};

/**
 * Deterministic PRNG. Scenes must render identically on the server and on the
 * client, so no Math.random() anywhere in the art pipeline.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
