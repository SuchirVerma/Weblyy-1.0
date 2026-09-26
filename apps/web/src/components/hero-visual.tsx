"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Radar, type Blip } from "./radar";
import { useReducedSafe } from "./use-reduced";
import styles from "./landing.module.css";

const DEMO_BLIPS: Blip[] = [
  { id: "a", channel: "whatsapp", label: "wa.me link" },
  { id: "b", channel: "booking", label: "Booking form" },
  { id: "c", channel: "web", label: "18 prices" },
  { id: "d", channel: "email", label: "hello@…" },
  { id: "e", channel: "phone", label: "+91 98765…" },
  { id: "f", channel: "form", label: "Contact form" },
  { id: "g", channel: "social", label: "Instagram" },
];

const BUBBLES = ["Hair spa kitne ka hai?", "Saturday 4pm free hai?", "Kab tak khule ho?", "Parking hai?", "Facial ka rate?", "Bridal makeup price?"];

export function HeroVisual() {
  const reduce = useReducedSafe();
  const [tick, setN] = useState(0);
  const n = reduce ? DEMO_BLIPS.length : tick;
  const [bubble, setBubble] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((v) => (v >= DEMO_BLIPS.length + 3 ? 0 : v + 1)), 900);
    return () => clearInterval(t);
  }, [reduce]);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setBubble((b) => (b + 1) % BUBBLES.length), 2400);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div className={styles.heroVisual}>
      <Radar blips={DEMO_BLIPS.slice(0, Math.min(n, DEMO_BLIPS.length))} scanning centerLabel="your business" />
      <div className={styles.bubbleLane} aria-hidden="true">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={bubble}
            className={styles.bubble}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.bubbleWho}>customer · 21:4{bubble}</span>
            {BUBBLES[bubble]}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`r${bubble}`}
            className={`${styles.bubble} ${styles.bubbleAgent}`}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.5, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.bubbleWho}>agent · replied in 3s</span>
            {["Hair Spa ₹1,200 hai. Slot book kar du?", "Haan ji! Kaunsi service? Team confirm karegi.", "Tue–Sun, 10am se 8:30pm tak.", "Haan, free parking bahar hi hai.", "Fruit Facial ₹900, Gold ₹1,500.", "Bridal HD ₹18,000 se start."][bubble]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
