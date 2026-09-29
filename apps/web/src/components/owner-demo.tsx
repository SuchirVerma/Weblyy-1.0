"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow } from "./ui";
import { useReducedSafe } from "./use-reduced";
import styles from "./owner-demo.module.css";

type Who = "priya" | "rahul" | "neha";
const PEOPLE: Record<Who, { name: string; color: string }> = {
  priya: { name: "Priya", color: "#7c3aed" },
  rahul: { name: "Rahul", color: "#0d9488" },
  neha: { name: "Neha", color: "#db2777" },
};

type Ev =
  | { t: "cust"; who: Who; text: string; at: string }
  | { t: "agent"; who: Who; text: string; status: Status }
  | { t: "notify"; who: Who; tone: "quiet" | "booking" | "urgent"; title: string; body: string }
  | { t: "open"; who: Who }
  | { t: "typing"; who: Who; text: string }
  | { t: "owner"; who: Who; text: string; oneTap?: boolean }
  | { t: "handback"; who: Who }
  | { t: "inbox" }
  | { t: "summary" };

type Status = "agent" | "booking" | "needs" | "handling" | "done";

interface Step {
  kicker: string;
  title: string;
  body: string;
  events: { ev: Ev; wait: number }[];
}

const STEPS: Step[] = [
  {
    kicker: "8:10 pm · the salon is closed",
    title: "A price question. The owner's phone stays quiet.",
    body: "Priya asks what a hair spa costs. The agent answers from the price list on the website in two seconds. The owner sees it in the inbox as handled, with no ping and no interruption.",
    events: [
      { ev: { t: "cust", who: "priya", text: "Hair spa kitne ka hai?", at: "8:10 pm" }, wait: 900 },
      { ev: { t: "agent", who: "priya", text: "Hair Spa ₹1,200 hai. Aapke liye slot book kar du?", status: "agent" }, wait: 1600 },
      { ev: { t: "notify", who: "priya", tone: "quiet", title: "Handled by your agent", body: "Priya · price question · answered in 2s" }, wait: 1800 },
    ],
  },
  {
    kicker: "8:24 pm",
    title: "A booking. The owner confirms it with one tap.",
    body: "Rahul wants a haircut tomorrow at 11. The agent collects the details, and the owner gets a booking card. One tap on Confirm and Rahul gets his confirmation.",
    events: [
      { ev: { t: "cust", who: "rahul", text: "Kal 11 baje haircut ho jayega?", at: "8:24 pm" }, wait: 900 },
      { ev: { t: "agent", who: "rahul", text: "Kal 11am note kar liya! Team 2 minute mein confirm karegi.", status: "booking" }, wait: 1500 },
      { ev: { t: "notify", who: "rahul", tone: "booking", title: "Booking request", body: "Rahul · Haircut · Tomorrow 11:00 am" }, wait: 2600 },
      { ev: { t: "owner", who: "rahul", text: "Confirmed ✅ Haircut, tomorrow 11:00 am. See you, Rahul!", oneTap: true }, wait: 2000 },
    ],
  },
  {
    kicker: "9:02 pm",
    title: "A complaint. This one comes straight to the owner.",
    body: "Neha had a reaction after a facial. The agent never argues or promises money. It apologises, tells her the owner will reach out, and sends the owner an urgent alert.",
    events: [
      { ev: { t: "cust", who: "neha", text: "Facial ke baad face pe rash ho gaya hai 😟", at: "9:02 pm" }, wait: 900 },
      { ev: { t: "agent", who: "neha", text: "I'm really sorry about this. I've alerted the owner, and they'll personally reach out to you in a few minutes.", status: "needs" }, wait: 1500 },
      { ev: { t: "notify", who: "neha", tone: "urgent", title: "Needs you now", body: "Neha · complaint after a facial" }, wait: 2400 },
    ],
  },
  {
    kicker: "9:04 pm",
    title: "The owner replies personally, from the same inbox.",
    body: "The owner opens Neha's chat, reads what happened, and writes back. The reply lands in Neha's chat instantly. The agent pauses for Neha so it never talks over the owner.",
    events: [
      { ev: { t: "open", who: "neha" }, wait: 1100 },
      { ev: { t: "typing", who: "neha", text: "Neha, I'm so sorry. Please come in tomorrow, the soothing treatment is on us. Calling you in 5 minutes." }, wait: 3200 },
      { ev: { t: "owner", who: "neha", text: "Neha, I'm so sorry. Please come in tomorrow, the soothing treatment is on us. Calling you in 5 minutes." }, wait: 1800 },
      { ev: { t: "cust", who: "neha", text: "Thank you ma'am 🙏", at: "9:05 pm" }, wait: 1800 },
    ],
  },
  {
    kicker: "9:06 pm",
    title: "Sorted. The owner hands the chat back to the agent.",
    body: "Neha's message went only to the owner, and the agent stayed quiet. With the issue handled, one tap hands the chat back, and the agent takes over again.",
    events: [
      { ev: { t: "handback", who: "neha" }, wait: 1500 },
      { ev: { t: "inbox" }, wait: 1600 },
    ],
  },
  {
    kicker: "10:30 pm · end of the day",
    title: "The owner's day, in one card.",
    body: "Most messages never needed the owner. The ones that did came with context and a one-tap action. That's the whole job: answer the routine, escalate the important.",
    events: [{ ev: { t: "summary" }, wait: 2000 }],
  },
];

const FLAT = STEPS.flatMap((s, si) => s.events.map((e, ei) => ({ ...e, step: si, first: ei === 0 })));

interface ChatMsg {
  role: "customer" | "agent" | "owner";
  text: string;
  at?: string;
}
interface State {
  chats: Record<Who, ChatMsg[]>;
  status: Record<Who, Status | null>;
  last: Record<Who, string>;
  active: Who;
  notice: Extract<Ev, { t: "notify" }> | null;
  ownerView: { kind: "inbox" } | { kind: "thread"; who: Who } | { kind: "summary" };
  typing: string;
  tapped: boolean;
}

function build(n: number): State {
  const s: State = {
    chats: { priya: [], rahul: [], neha: [] },
    status: { priya: null, rahul: null, neha: null },
    last: { priya: "", rahul: "", neha: "" },
    active: "priya",
    notice: null,
    ownerView: { kind: "inbox" },
    typing: "",
    tapped: false,
  };
  for (const { ev } of FLAT.slice(0, n)) {
    if (ev.t !== "notify" && ev.t !== "typing") s.notice = null;
    s.typing = "";
    switch (ev.t) {
      case "cust":
        s.active = ev.who;
        s.chats[ev.who].push({ role: "customer", text: ev.text, at: ev.at });
        s.last[ev.who] = ev.text;
        if (s.status[ev.who] === "handling") s.status[ev.who] = "handling";
        break;
      case "agent":
        s.chats[ev.who].push({ role: "agent", text: ev.text });
        s.status[ev.who] = ev.status;
        s.last[ev.who] = `Agent: ${ev.text}`;
        break;
      case "notify":
        s.notice = ev;
        s.tapped = false;
        break;
      case "open":
        s.ownerView = { kind: "thread", who: ev.who };
        break;
      case "typing":
        s.ownerView = { kind: "thread", who: ev.who };
        s.typing = ev.text;
        break;
      case "owner":
        s.active = ev.who;
        s.chats[ev.who].push({ role: "owner", text: ev.text });
        s.status[ev.who] = ev.oneTap ? "done" : "handling";
        s.last[ev.who] = `You: ${ev.text}`;
        s.tapped = Boolean(ev.oneTap);
        break;
      case "handback":
        s.status[ev.who] = "agent";
        break;
      case "inbox":
        s.ownerView = { kind: "inbox" };
        break;
      case "summary":
        s.ownerView = { kind: "summary" };
        break;
    }
  }
  return s;
}

const STATUS_LABEL: Record<Status, string> = {
  agent: "Handled by agent",
  booking: "Booking to confirm",
  needs: "Needs you",
  handling: "You're handling",
  done: "Confirmed",
};

export function OwnerDemo() {
  const reduce = useReducedSafe();
  const [n, setN] = useState(0);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const state = useMemo(() => build(n), [n]);
  const step = n === 0 ? 0 : FLAT[Math.min(n, FLAT.length) - 1].step;
  const done = n >= FLAT.length;

  // Start playing when the demo scrolls into view.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          setPlaying(true);
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  useEffect(() => {
    if (!playing || done) return;
    const wait = n === 0 ? 600 : FLAT[n - 1].wait;
    const t = setTimeout(() => setN((x) => x + 1), wait);
    return () => clearTimeout(t);
  }, [playing, n, done]);

  const stepEnd = (i: number) => FLAT.findLastIndex((e) => e.step === i) + 1;
  const goStep = (i: number) => {
    if (playing) setN(FLAT.findIndex((e) => e.step === i) + 1);
    else setN(stepEnd(i));
  };
  const next = () => {
    if (done) return;
    setPlaying(false);
    const cur = n === 0 ? -1 : step;
    const curEnd = cur < 0 ? 0 : stepEnd(cur);
    setN(n < curEnd ? curEnd : stepEnd(cur + 1));
  };
  const restart = () => {
    setN(0);
    setPlaying(true);
  };

  const who = state.active;
  const thread = state.ownerView.kind === "thread" ? state.ownerView.who : null;

  return (
    <div className={styles.demo} ref={stageRef}>
      <div className={styles.stage}>
        {/* Customer side */}
        <div className={styles.side}>
          <p className={styles.sideLabel}>What the customer sees</p>
          <div className={styles.phone}>
            <div className={styles.tabs} role="tablist" aria-label="Customers">
              {(Object.keys(PEOPLE) as Who[]).map((w) => (
                <span key={w} role="tab" aria-selected={w === who} className={styles.tab} data-on={w === who || undefined} style={{ ["--c" as string]: PEOPLE[w].color }}>
                  {PEOPLE[w].name}
                </span>
              ))}
            </div>
            <div className={styles.chatHead}>
              <span className={styles.bizAvatar}>K</span>
              <div>
                <b>Kesar Beauty Studio</b>
                <small>replies instantly</small>
              </div>
            </div>
            <div className={styles.chat}>
              <AnimatePresence initial={false} mode="popLayout">
                {state.chats[who].map((m, i) => (
                  <motion.div
                    key={`${who}-${i}`}
                    className={styles.bubble}
                    data-role={m.role}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {m.role === "owner" && <span className={styles.from}>Owner</span>}
                    {m.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              {state.chats[who].length === 0 && <p className={styles.hint}>Waiting for {PEOPLE[who].name} to message…</p>}
            </div>
          </div>
        </div>

        {/* Narration */}
        <div className={styles.story} aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
              <p className="kicker">{STEPS[step].kicker}</p>
              <h3>{STEPS[step].title}</h3>
              <p className="muted">{STEPS[step].body}</p>
            </motion.div>
          </AnimatePresence>
          <div className={styles.progress} aria-hidden="true">
            <motion.div className={styles.progressFill} animate={{ scaleX: n / FLAT.length }} transition={{ duration: 0.4 }} />
          </div>
          <div className={styles.controls}>
        <ol className={styles.steps} aria-label="Demo steps">
          {STEPS.map((s, i) => (
            <li key={i}>
              <button onClick={() => goStep(i)} data-state={i < step || (done && i === step) ? "done" : i === step && n > 0 ? "now" : "todo"} aria-current={i === step ? "step" : undefined}>
                <span>{i + 1}</span>
                <em>{s.title.split(".")[0]}</em>
              </button>
            </li>
          ))}
        </ol>
        <div className={styles.buttons}>
          {done ? (
            <button className="btn btn-primary btn-sm" onClick={restart}>
              Play again
            </button>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setPlaying(!playing)}>
                {playing ? "Pause" : n === 0 ? "Play" : "Resume"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={next}>
                Next step →
              </button>
            </>
          )}
        </div>
      </div>

        </div>

        {/* Owner side */}
        <div className={styles.side}>
          <p className={styles.sideLabel}>What the owner sees</p>
          <div className={`${styles.phone} ${styles.ownerPhone}`}>
            <div className={styles.status}>
              <span>9:41</span>
              <span>Owner inbox</span>
            </div>

            <AnimatePresence>
              {state.notice && (
                <motion.div
                  key={`${state.notice.who}-${state.notice.title}`}
                  className={styles.notice}
                  data-tone={state.notice.tone}
                  initial={{ opacity: 0, y: -30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                >
                  <b>
                    {state.notice.tone === "urgent" ? "🔴 " : state.notice.tone === "booking" ? "📅 " : "✓ "}
                    {state.notice.title}
                  </b>
                  <span>{state.notice.body}</span>
                  {state.notice.tone === "booking" && (
                    <div className={styles.noticeActions}>
                      <span className={styles.fakeBtn} data-primary data-tapped={state.tapped || undefined}>
                        {state.tapped ? "Confirmed ✓" : "Confirm"}
                      </span>
                      <span className={styles.fakeBtn}>Suggest another time</span>
                    </div>
                  )}
                  {state.notice.tone === "urgent" && (
                    <div className={styles.noticeActions}>
                      <span className={styles.fakeBtn} data-primary>
                        Open chat
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.ownerBody}>
              <AnimatePresence mode="wait">
                {state.ownerView.kind === "summary" ? (
                  <motion.div key="summary" className={styles.summary} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="kicker">Today at Kesar</p>
                    <div className={styles.sumGrid}>
                      <div>
                        <b>38</b>
                        <span>messages</span>
                      </div>
                      <div>
                        <b>34</b>
                        <span>answered by the agent</span>
                      </div>
                      <div>
                        <b>4</b>
                        <span>needed you</span>
                      </div>
                      <div>
                        <b>76 min</b>
                        <span>of typing saved</span>
                      </div>
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>
                      3 bookings confirmed · 1 complaint handled personally · 0 customers left waiting overnight
                    </p>
                  </motion.div>
                ) : thread ? (
                  <motion.div key={`thread-${thread}`} className={styles.thread} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <div className={styles.threadHead}>
                      <span>←</span>
                      <b>{PEOPLE[thread].name}</b>
                      {state.status[thread] && (
                        <span className={styles.chip} data-s={state.status[thread]!}>
                          {STATUS_LABEL[state.status[thread]!]}
                        </span>
                      )}
                    </div>
                    <div className={styles.threadMsgs}>
                      {state.chats[thread].map((m, i) => (
                        <div key={i} className={styles.tMsg} data-role={m.role}>
                          <small>{m.role === "customer" ? PEOPLE[thread].name : m.role === "agent" ? "Agent" : "You"}</small>
                          {m.text}
                        </div>
                      ))}
                    </div>
                    <div className={styles.compose}>
                      <span className={styles.composeText}>
                        {state.typing ? <TypeOut text={state.typing} /> : <span className="muted">Reply as the owner</span>}
                      </span>
                      <span className={styles.send}>↑</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.ul key="inbox" className={styles.inbox} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    {(Object.keys(PEOPLE) as Who[])
                      .filter((w) => state.status[w] !== null)
                      .sort((a, b) => Number(state.status[b] === "needs") - Number(state.status[a] === "needs"))
                      .map((w) => (
                        <motion.li key={w} layout className={styles.row}>
                          <span className={styles.rowAvatar} style={{ background: PEOPLE[w].color }}>
                            {PEOPLE[w].name[0]}
                          </span>
                          <span className={styles.rowBody}>
                            <b>{PEOPLE[w].name}</b>
                            <span>{state.last[w]}</span>
                          </span>
                          <span className={styles.chip} data-s={state.status[w]!}>
                            {STATUS_LABEL[state.status[w]!]}
                          </span>
                        </motion.li>
                      ))}
                    {(Object.keys(PEOPLE) as Who[]).every((w) => state.status[w] === null) && <li className={styles.hint}>No messages yet. Quiet evening so far.</li>}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {done && (
        <motion.div className={styles.cta} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p>That&apos;s the owner&apos;s side. Want to try it for real?</p>
          <div className="chips">
            <Link className="btn btn-primary" href="/scan?url=demo">
              Run it live on the demo salon <Arrow />
            </Link>
            <Link className="btn btn-ghost" href="/integrate">
              How to add it to a business
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function TypeOut({ text }: { text: string }) {
  const reduce = useReducedSafe();
  const [k, setK] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setK((x) => (x >= text.length ? x : x + 3)), 40);
    return () => clearInterval(t);
  }, [text, reduce]);
  return (
    <span>
      {text.slice(0, reduce ? text.length : k)}
      <span className={styles.caret} />
    </span>
  );
}
