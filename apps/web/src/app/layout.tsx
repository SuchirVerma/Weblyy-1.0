import type { Metadata, Viewport } from "next";
import { Albert_Sans, Bricolage_Grotesque, DM_Mono } from "next/font/google";
import { MotionRoot } from "@/components/motion-root";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], axes: ["opsz"] });
const body = Albert_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = DM_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Weblyy: Make your business AI-ready",
  description:
    "Turn your existing website into an AI-powered customer acquisition system: AI readiness audit, website transformation, AI Customer Agent, AI search readiness, Lead Center and automations.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23111827'/%3E%3Ccircle cx='16' cy='16' r='10' fill='none' stroke='%2360a5fa' stroke-width='2' opacity='.5'/%3E%3Ccircle cx='16' cy='16' r='5' fill='none' stroke='%2360a5fa' stroke-width='2'/%3E%3Cpath d='M16 16 L25 9' stroke='%2360a5fa' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='22' cy='20' r='2' fill='%234ade80'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: "#f7f8fa" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <div className="env" aria-hidden="true">
          <div className="env-glow env-glow-a" />
          <div className="env-glow env-glow-b" />
          <div className="env-grid" />
          <div className="env-grain" />
        </div>
        <MotionRoot>{children}</MotionRoot>
      </body>
    </html>
  );
}
