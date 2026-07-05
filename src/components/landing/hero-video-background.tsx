"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Hero background.
 *
 * Previously this component rendered an external `<video>` sourced from
 * `https://typefive.b-cdn.net/design-system-hero-new.mp4` (a third-party
 * CDN that appears to be a leftover from a starter template). It never
 * rendered in production because the project CSP only allows
 * `media-src 'self' blob:` — the cross-origin video was silently blocked
 * by the browser, leaving the hero section with only the dark gradient
 * overlays and no visible imagery.
 *
 * Fix: use the existing in-repo `public/hero-bg.png` (already shipped,
 * already CSP-allowed via `img-src 'self'`) as a parallax background
 * image. This restores the hero visual, removes the external dependency,
 * and is guaranteed to load. The parallax motion + gradient overlays are
 * preserved so the visual design is unchanged.
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
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative background image, no Next/Image optimization needed for a full-bleed hero */}
        <img
          src="/hero-bg.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.9) saturate(1.2)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/30 via-[#0A1628]/20 to-[#0A1628]/60" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/5 via-transparent to-[#0F2557]/8" />
      </motion.div>
    </motion.div>
  );
}
