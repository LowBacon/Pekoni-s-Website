import type { Metadata, Viewport } from "next";
import { Manrope, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/server/auth";
import PreferencesProvider from "@/components/providers/PreferencesProvider";
import ToastProvider from "@/components/providers/ToastProvider";
import PlayerProvider from "@/components/providers/PlayerProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pekoni.local"),
  title: {
    default: "Pekoni | Minecraft Gaming Community",
    template: "%s",
  },
  description:
    "Pekoni is a cinematic Minecraft-inspired community and gaming platform featuring MineBet minigames, progression, cases, leaderboards and virtual Pekoni Coins.",
  applicationName: "Pekoni",
  keywords: ["Pekoni", "MineBet", "Minecraft", "yhteisö", "pelit", "Pekoni Coins"],
  openGraph: {
    title: "Pekoni | Minecraft Gaming Community",
    description:
      "Pelaa, kehity ja rakenna oma tarinasi Pekoni-yhteisössä. MineBet-pelit, caset, leaderboardit ja Pekoni Coins.",
    siteName: "Pekoni",
    type: "website",
    locale: "fi_FI",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080B09",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html
      lang="fi"
      className={`${manrope.variable} ${instrument.variable}`}
      data-reduced-motion={user?.reducedMotion ? "true" : "false"}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <PreferencesProvider
          initial={{
            soundEnabled: user?.soundEnabled ?? false,
            reducedMotion: user?.reducedMotion ?? false,
          }}
        >
          <ToastProvider>
            <PlayerProvider
              initial={
                user
                  ? {
                      id: user.id,
                      username: user.username,
                      role: user.role,
                      minecraftUsername: user.minecraftUsername,
                      balance: user.balance,
                      level: user.level,
                      xp: user.xp,
                    }
                  : null
              }
            >
              {children}
            </PlayerProvider>
          </ToastProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
