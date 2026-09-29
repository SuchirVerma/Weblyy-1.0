"use client";
import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import styles from "./landing.module.css";
const STEPS = [
  {
    n: "01",
    title: "Audit",
    time: "~30 sec",
    body: "Enter your website, business name or @instagram. We check it against what a business like yours needs: a school, a salon and a shop each need different things.",
    out: ["Score 34/100", "No fee structure", "Hard to find on Google", "No website, only Instagram"],
  },
  {
    n: "02",
    title: "Rebuild",
    time: "one click",
    body: "We build the website your business should have, from your real details: the right sections, the right main button and everything Google needs.",
    out: ["New website live", "“Admission enquiry” button", "Google-ready details"],
  },
  {
    n: "03",
    title: "Add what helps",
    time: "optional",
    body: "Extras only where they fit: a booking form for a salon, a table request for a restaurant, an assistant that answers common questions.",
    out: ["Table request for a restaurant", "Free demo for a coaching class", "No booking for a school"],
  },
  {
    n: "04",
    title: "Grow",
    time: "live",
    body: "Every enquiry lands in one place, so none are lost. You see what's working from one dashboard.",
    out: ["12 enquiries this week", "Follow-up ready", "Found on Google"],
  },
];
export function Steps() {
  const ref = useRef(null);
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
