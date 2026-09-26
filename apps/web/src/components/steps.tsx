"use client";
import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import styles from "./landing.module.css";

const STEPS = [
  {
    n: "01",
    title: "Scan",
    time: "~30 sec",
    body: "We read your site like a customer would: WhatsApp links, forms, emails, booking widgets, price lists, FAQs and timings.",
    out: [
      "wa.me link found",
      "Booking form · 4 fields",
      "18 prices published",
      "No auto-reply",
    ],
  },
  {
    n: "02",
    title: "Ask",
    time: "~20 sec",
    body: "Four one-tap questions fill what a website can't show: how many messages you get, and who answers them.",
    out: ["40 messages / day", "Owner replies", "Reminders: manual"],
  },
  {
    n: "03",
    title: "Score",
    time: "instant",
    body: "Every workflow gets a score, hours saved and a verdict: automate, assist, or human only.",
    out: ["Price enquiries · 86", "Booking · 57", "Complaints · human"],
  },
  {
    n: "04",
    title: "Deploy",
    time: "one hold",
    body: "Hold the button and the agent goes live, with an n8n workflow and a Twilio WhatsApp webhook ready to plug in.",
    out: ["Agent live", "QR for customers", "n8n JSON exported"],
  },
];

export function Steps() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 60%"],
  });
  const draw = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <div className={styles.stepsWrap}>
      <div className={styles.stepsLine} aria-hidden="true">
        <motion.div className={styles.stepsLineDraw} style={{ scaleX: draw }} />
      </div>
      <ol className={styles.steps} ref={ref}>
        {STEPS.map((s, i) => (
          <motion.li
            key={s.n}
            className={styles.step}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{
              duration: 0.7,
              delay: i * 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className={styles.stepTop}>
              <span className={styles.stepNum}>{s.n}</span>
            </div>
            <h3>
              {s.title} <span className="mono muted">{s.time}</span>
            </h3>
            <p className="muted">{s.body}</p>
            <ul className={styles.stepOut} aria-label="Example output">
              {s.out.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
