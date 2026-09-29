"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Radar } from "./radar";
import { useReducedSafe } from "./use-reduced";
import styles from "./landing.module.css";
const DEMO_BLIPS = [
  { id: "a", channel: "whatsapp", label: "wa.me link" },
  { id: "b", channel: "booking", label: "Booking form" },
  { id: "c", channel: "web", label: "18 prices" },
  { id: "d", channel: "email", label: "hello@…" },
  { id: "e", channel: "phone", label: "+91 98765…" },
  { id: "f", channel: "form", label: "Contact form" },
  { id: "g", channel: "social", label: "Instagram" },
];
// Each kind of business gets a different website: the pair shows the business, then what its site leads with.
const BUBBLES = ["A school", "A salon", "A restaurant", "A clinic", "A shop", "A coaching institute"];
const REPLIES = [
  "Admissions · Fee structure · Notices · Directions",
  "Services & prices · Book a slot · Gallery",
  "Menu · Reserve a table · Directions",
  "Doctors & timings · Book a consultation",
  "Products · Is it in stock? · Directions",
  "Courses & batches · Free demo class · Results",
];
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
        <AnimatePresence mode="wait">
          <motion.div
            key={bubble}
            className={styles.bubblePair}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className={styles.bubble}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={styles.bubbleWho}>business</span>
              {BUBBLES[bubble]}
            </motion.div>
            <motion.div
              className={`${styles.bubble} ${styles.bubbleAgent}`}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={styles.bubbleWho}>its Weblyy website leads with</span>
              {REPLIES[bubble]}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
