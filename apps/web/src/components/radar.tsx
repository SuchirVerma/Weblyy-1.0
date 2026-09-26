"use client";
import { AnimatePresence, motion } from "motion/react";
import type { Channel } from "@/lib/types";
import styles from "./radar.module.css";

export interface Blip {
  id: string;
  channel: Channel;
  label: string;
}

const RING: Record<Channel, number> = {
  whatsapp: 0.42,
  chat: 0.42,
  phone: 0.42,
  booking: 0.66,
  form: 0.66,
  email: 0.66,
  web: 0.88,
  social: 0.88,
};

export const CHANNEL_NAME: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  chat: "Live chat",
  phone: "Phone",
  booking: "Booking",
  form: "Form",
  email: "Email",
  web: "Website",
  social: "Social",
};

const GOLDEN = 137.508;

function place(i: number, channel: Channel) {
  const angle = ((i * GOLDEN + 18) % 360) * (Math.PI / 180);
  const r = RING[channel] * 46;
  return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r };
}

export function Radar({
  blips,
  scanning,
  centerLabel,
  showLabels = true,
}: {
  blips: Blip[];
  scanning: boolean;
  centerLabel?: string;
  showLabels?: boolean;
}) {
  return (
    <div className={styles.radar} data-scanning={scanning || undefined} role="img" aria-label={`Touchpoint map: ${blips.length} found`}>
      <div className={styles.sweep} aria-hidden="true" />
      <svg viewBox="0 0 100 100" className={styles.svg} aria-hidden="true">
        {[0.22, 0.44, 0.66, 0.88].map((r) => (
          <circle key={r} cx="50" cy="50" r={r * 46} className={styles.ring} />
        ))}
        <line x1="50" y1="3" x2="50" y2="97" className={styles.axis} />
        <line x1="3" y1="50" x2="97" y2="50" className={styles.axis} />
        {blips.map((b, i) => {
          const p = place(i, b.channel);
          return (
            <motion.line
              key={`l-${b.id}`}
              x1="50"
              y1="50"
              x2={p.x}
              y2={p.y}
              className={styles.link}
              style={{ stroke: `var(--ch-${b.channel})` }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.55 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </svg>
      <div className={styles.center}>
        <span className={styles.core} />
        {centerLabel && <span className={styles.centerLabel}>{centerLabel}</span>}
      </div>
      <AnimatePresence>
        {blips.map((b, i) => {
          const p = place(i, b.channel);
          const right = p.x < 62;
          return (
            <motion.div
              key={b.id}
              className={styles.blip}
              style={{ left: `${p.x}%`, top: `${p.y}%`, ["--c" as string]: `var(--ch-${b.channel})` }}
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
            >
              <span className={styles.pulse} />
              <span className={styles.point} />
              {showLabels && (
                <span className={styles.tag} data-side={right ? "right" : "left"}>
                  <b>{CHANNEL_NAME[b.channel]}</b>
                  {b.label}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
