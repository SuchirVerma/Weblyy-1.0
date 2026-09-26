"use client";
import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import styles from "./landing.module.css";

const STEPS = [
  {
    n: "01",
    title: "Audit",
    time: "~30 sec",
    body: "Enter your website, business name or @instagram. We score your AI readiness across website, agent, lead capture, AI search and automation.",
    out: ["AI readiness 34/100", "No AI agent", "No structured data", "Leads not tracked"],
  },
  {
    n: "02",
    title: "Transform",
    time: "one click",
    body: "Make My Business AI-Ready rebuilds your site to convert and adds structured data, FAQs and a lead form, using your real content.",
    out: ["AI-ready website live", "Book / Call / Chat CTAs", "AI search pack"],
  },
  {
    n: "03",
    title: "Engage",
    time: "24/7",
    body: "Your AI Customer Agent answers from your own site, asks interested customers for their details, and hands tricky chats to you.",
    out: ["Hair Spa ₹1,200", "“Share your name & number”", "Complaint → owner"],
  },
  {
    n: "04",
    title: "Convert",
    time: "live",
    body: "Leads land in the Lead Center, qualified, with a follow-up ready. Automations and the Command Center track everything.",
    out: ["Riya · hot · 92", "Follow-up drafted", "3 automations ran"],
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
