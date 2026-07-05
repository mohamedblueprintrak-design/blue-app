"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Hero background — autoplaying looping video with a static image fallback.
 *
 * The `<video>` is sourced from the bundled `/hero.mp4` asset (downloaded
 * once from the original `typefive.b-cdn.net` CDN and committed to the repo
 * so we have no runtime external dependency). The previous external CDN URL
 * was silently blocked by the project CSP (`media-src 'self' blob:`), which
 * is why the hero looked empty. Bundling the file locally means it is
 * served from `'self'` (always CSP-allowed) and is also available offline.
 *
 * Inside the `<video>` element we keep a fallback `<img>` using the
 * existing `public/hero-bg.png` — browsers render this automatically if
 * the `<source>` fails to load or if the user agent doesn't support
 * `<video>` (e.g., very old browsers / some accessibility tools).
 *
 * Autoplay attributes (`autoPlay muted playsInline`) are required for
 * iOS Safari to start playback without a user gesture. `loop` makes the
 * clip run endlessly in the background; `preload="auto"` hints the browser
 * to fetch it immediately. The clip is purely decorative so it is marked
 * `aria-hidden="true"`; the hero text in the foreground is the real
 * content.
 *
 * The parallax motion (y/opacity transforms) + gradient overlays are
 * preserved from the original implementation. The previous play/pause
 * toggle button has been intentionally removed — autoplay background video
 * shouldn't have interactive controls, and a paused background video
 * defeats its purpose.
 *
 * Component name kept as `HeroVideoBackground` to avoid touching the
 * parent import graph (`landing-page-client.tsx`).
 */
export function HeroVideoBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ y, opacity }} className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "brightness(0.9) saturate(1.2)" }}
        >
          <source src="/hero.mp4" type="video/mp4" />
          {/* Fallback: if the video can't load, show the static hero image. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative background image fallback inside <video>, no Next/Image optimization needed */}
          <img
            src="/hero-bg.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/30 via-[#0A1628]/20 to-[#0A1628]/60" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/5 via-transparent to-[#0F2557]/8" />
      </motion.div>
    </motion.div>
  );
}
