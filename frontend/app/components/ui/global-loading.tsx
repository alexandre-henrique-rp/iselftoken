import { useEffect, useState } from "react";
import { useLocation, useNavigation } from "react-router";

const SHOW_DELAY_MS = 120;
const FADE_MS = 180;
const MAX_VISIBLE_MS = 10_000;

const EDIT_SHELL_RE = /^\/founder\/startups\/[^/]+\/(?:edit|captacao)(?:\/|$)/;

export function GlobalLoading() {
  const navigation = useNavigation();
  const location = useLocation();
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("hidden");

  const isSameEditShell =
    navigation.location !== undefined &&
    EDIT_SHELL_RE.test(location.pathname) &&
    EDIT_SHELL_RE.test(navigation.location.pathname);
  const isDashboardFilterLoading =
    navigation.state === "loading" &&
    location.pathname === "/founder/dashboard" &&
    navigation.location?.pathname === location.pathname &&
    navigation.location.search !== location.search;
  const isPathChangeLoading =
    (navigation.state === "loading" &&
      navigation.location !== undefined &&
      navigation.location.pathname !== location.pathname &&
      !isSameEditShell) ||
    isDashboardFilterLoading;

  useEffect(() => {
    if (!isPathChangeLoading) return;
    const showTimer = setTimeout(() => setPhase("visible"), SHOW_DELAY_MS);
    const maxTimer = setTimeout(() => setPhase("hidden"), MAX_VISIBLE_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(maxTimer);
    };
  }, [isPathChangeLoading]);

  useEffect(() => {
    if (navigation.state !== "idle") return;
    if (phase !== "visible") return;
    setPhase("fading");
    const fadeTimer = setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => clearTimeout(fadeTimer);
  }, [navigation.state, phase]);

  useEffect(() => {
    if (phase === "hidden") return;
    const safetyTimer = setTimeout(() => setPhase("hidden"), MAX_VISIBLE_MS);
    return () => clearTimeout(safetyTimer);
  }, [phase]);

  if (phase === "hidden") return null;
  // Smoke/preview helper — ?nooverlay=1 esconde o overlay (útil para smoke automatizado).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nooverlay") === "1") return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-[1px] transition-opacity duration-200 ${
        phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(213,0,249,0.08)_0%,rgba(0,0,0,1)_70%)]" />

      <div className="fixed left-8 top-1/2 -translate-y-1/2 w-px h-32 bg-linear-to-b from-transparent via-[#d500f9]/30 to-transparent" />
      <div className="fixed right-8 top-1/2 -translate-y-1/2 w-px h-32 bg-linear-to-b from-transparent via-[#d500f9]/30 to-transparent" />

      <div className="fixed bottom-[-5%] right-[-2%] text-[20rem] font-extrabold text-[rgba(213,0,249,0.03)] pointer-events-none select-none leading-none">
        IS
      </div>

      <main className="relative z-10 flex flex-col items-center">
        <div className="mb-12 flex flex-col items-center">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter text-[#d500f9] logo-glow-pulse select-none">
            iSelfToken
          </h1>
          <p className="mt-4 text-sm md:text-base lg:text-lg tracking-[0.4em] text-white/40 uppercase font-medium">
            crowdfunding
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="loading-bar-container">
            <div className="loading-bar-fill" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">
            carregando...
          </span>
        </div>
      </main>
    </div>
  );
}
