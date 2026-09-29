"use client";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
export function MotionRoot({ children }) {
  useEffect(() => {
    const onVis = () => document.body.classList.toggle("paused", document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
