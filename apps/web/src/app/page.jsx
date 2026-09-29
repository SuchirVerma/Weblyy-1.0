import { HeroVisual } from "@/components/hero-visual";
import { CinematicIntro } from "@/components/intro/cinematic-intro";
import { Nav, ScanBar } from "@/components/ui";
import Link from "next/link";
import styles from "@/components/landing.module.css";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <>
      <CinematicIntro nextId="product" />
      <div id="product" style={{ scrollMarginTop: 0 }} />
      <Nav />
      <main id="main" tabIndex={-1}>
        <section className={`wrap ${styles.hero} ${styles.heroOnly}`}>
          <div className={styles.heroCopy}>
            <h1 className={`h-display ${styles.heroTitle}`}>
              Make your business <span className="em">AI-ready.</span>
            </h1>
            <p className="lede">
              Type your website, shop name or Instagram. We show what a business like yours is missing, and build the website it should have.
            </p>
            <ScanBar />
            <Link href="/how" className={styles.secondary}>
              How does it work? →
            </Link>
            <p className={styles.regions}>
              For businesses in <Link href="/delhi">Delhi NCR</Link> · <Link href="/jammu-kashmir">Jammu &amp; Kashmir</Link> ·{" "}
              <Link href="/mumbai">Mumbai</Link>
            </p>
          </div>
          <HeroVisual />
        </section>
      </main>
    </>
  );
}
