import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { MotionRoot } from "@/components/motion-root";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "800"] });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "FlowScout: find what to automate, then automate it",
  description:
    "Paste a business website. FlowScout maps how customers reach you, finds the replies you type again and again, and deploys a WhatsApp agent that answers from your own site.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23121729'/%3E%3Ccircle cx='16' cy='16' r='10' fill='none' stroke='%23ff6a3d' stroke-width='2' opacity='.5'/%3E%3Ccircle cx='16' cy='16' r='5' fill='none' stroke='%23ff6a3d' stroke-width='2'/%3E%3Cpath d='M16 16 L25 9' stroke='%23ff6a3d' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='22' cy='20' r='2' fill='%234ade80'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: "#0f1320" };

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
