"use client";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedSafe } from "./use-reduced";
import styles from "./landing.module.css";

interface Msg {
  t: number; // minutes after 10:00
  text: string;
  reply: string;
  ownerDelay: number; // minutes the owner takes, -1 = never
}

const DAY: Msg[] = [
  { t: 12, text: "Hair spa kitne ka hai?", reply: "Hair Spa ₹1,200 hai. Slot book kar du?", ownerDelay: 95 },
  { t: 40, text: "Aaj 4 baje slot milega?", reply: "4pm note kiya! Team 5 min mein confirm karegi.", ownerDelay: 140 },
  { t: 75, text: "Facial rates please", reply: "Fruit ₹900, Gold ₹1,500, O3+ ₹2,500.", ownerDelay: 60 },
  { t: 130, text: "Where is the salon exactly?", reply: "Shop 14, Pocket C, Sector 9, Rohini. Maps link bhej raha hu.", ownerDelay: 210 },
  { t: 180, text: "Bridal makeup ka price?", reply: "Bridal HD ₹18,000, Airbrush ₹25,000.", ownerDelay: -1 },
  { t: 250, text: "Parking hai kya?", reply: "Haan ji, free parking bahar hi hai.", ownerDelay: 120 },
  { t: 330, text: "Kal Sunday open ho?", reply: "Haan, Sunday 10am se 8:30pm tak.", ownerDelay: -1 },
  { t: 420, text: "Keratin kitne ka?", reply: "Keratin ₹4,500 hai. Book kar du?", ownerDelay: 90 },
  { t: 560, text: "Still open? Coming in 20 min", reply: "Haan, 8:30 tak open hai. Aa jaiye!", ownerDelay: -1 },
  { t: 640, text: "Kal ke liye 11am book karna hai", reply: "11am note kiya! Team subah confirm karegi.", ownerDelay: -1 },
];

const END = 700; // 21:40
const clock = (m: number) => {
  const h = 10 + Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};

export function SaturdayReplay() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const reduce = useReducedSafe();
  const [clockNow, setNow] = useState(0);
  const now = reduce ? END : clockNow;
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);

  const play = useCallback(() => {
    setNow(0);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (inView && !started.current && !reduce) {
      started.current = true;
      play();
    }
  }, [inView, reduce, play]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let n = 0;
    const tick = (ts: number) => {
      n = Math.min(END, n + (ts - last) * 0.075);
      last = ts;
      setNow(n);
      if (n >= END) return setPlaying(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const arrived = DAY.filter((m) => m.t <= now);
  const ownerAnswered = arrived.filter((m) => m.ownerDelay >= 0 && m.t + m.ownerDelay <= now).length;
  const waiting = arrived.length - ownerAnswered;
  const lost = arrived.filter((m) => (m.ownerDelay < 0 || m.ownerDelay > 100) && now - m.t > 100).length;

  return (
    <div ref={ref} className={styles.replay}>
      <div className={styles.replayBar}>
        <div className={styles.clock}>
          <span className="mono muted" style={{ fontSize: ".75rem" }}>
            SATURDAY
          </span>
          <b className="mono">{clock(now)}</b>
        </div>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.trackFill} style={{ transform: `scaleX(${now / END})` }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={play} disabled={playing}>
          {playing ? "Playing…" : now >= END ? "Replay the day" : "Play"}
        </button>
      </div>

      <div className={styles.replayGrid}>
        <Phone title="Without Weblyy" subtitle="The owner replies between clients" badge={waiting > 0 ? `${waiting} unread` : "all caught up"} tone="bad" count={arrived.length + ownerAnswered}>
          {arrived.map((m) => {
            const answered = m.ownerDelay >= 0 && m.t + m.ownerDelay <= now;
            return (
              <Row key={m.t} text={m.text} time={clock(m.t)} reply={answered ? m.reply : null} replyTime={answered ? `${m.ownerDelay} min later` : null} pending={!answered} />
            );
          })}
        </Phone>
        <Phone title="With Weblyy" subtitle="The agent answers from the website" badge={`${arrived.length} answered`} tone="ok" count={arrived.length}>
          {arrived.map((m) => (
            <Row key={m.t} text={m.text} time={clock(m.t)} reply={m.reply} replyTime="3 sec later" />
          ))}
        </Phone>
      </div>

      <div className={styles.replayStats} aria-live="polite">
        <div>
          <b style={{ color: "var(--bad)" }}>{lost}</b>
          <span>customers likely lost to slow replies</span>
        </div>
        <div>
          <b style={{ color: "var(--ok)" }}>{arrived.length}</b>
          <span>answered in seconds, even after closing</span>
        </div>
        <div>
          <b>{Math.round(arrived.length * 2)} min</b>
          <span>of typing the owner never has to do</span>
        </div>
      </div>
    </div>
  );
}

function Phone({ title, subtitle, badge, tone, count, children }: { title: string; subtitle: string; badge: string; tone: "ok" | "bad"; count: number; children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const t = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div className={styles.phone} data-tone={tone}>
      <div className={styles.phoneHead}>
        <div>
          <b>{title}</b>
          <span className="muted">{subtitle}</span>
        </div>
        <span className={styles.badge}>{badge}</span>
      </div>
      <div className={styles.phoneBody} ref={scroller}>
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </div>
    </div>
  );
}

function Row({ text, time, reply, replyTime, pending }: { text: string; time: string; reply: string | null; replyTime: string | null; pending?: boolean }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className={styles.row}>
      <div className={styles.msgIn}>
        {text}
        <small>{time}</small>
      </div>
      {reply ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={styles.msgOut}>
          {reply}
          <small>{replyTime}</small>
        </motion.div>
      ) : pending ? (
        <div className={styles.typing} aria-label="No reply yet">
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </motion.div>
  );
}
