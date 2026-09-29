import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, Nav, Reveal, ScanBar, Footer } from "@/components/ui";
import landing from "@/components/landing.module.css";
import { REGIONS, regionByKey, type RegionKey } from "@/lib/regions";
import { siteUrl } from "@/lib/site-url";
import styles from "./region.module.css";

/** City pages: /delhi, /jammu-kashmir, /mumbai. Anything else under the root stays a 404. */
export const dynamicParams = false;
export function generateStaticParams() {
  return REGIONS.map((r) => ({ region: r.key }));
}

const COPY: Record<RegionKey, { title: string; lede: string; from: string; kinds: string[] }> = {
  delhi: {
    title: "Delhi NCR",
    from: "From Rohini and Model Town to Saket and Dwarka, and on to Gurugram, Noida, Ghaziabad and Faridabad.",
    lede: "Paste your website or Instagram. Weblyy checks it like a customer would, keeps your prices, photos and contact details, and rebuilds it for phones, with an AI assistant that answers customers in English and Hinglish, day and night.",
    kinds: ["salon", "dental clinic", "coaching", "cafe", "gym"],
  },
  "jammu-kashmir": {
    title: "Jammu & Kashmir",
    from: "From Gandhi Nagar and Trikuta Nagar in Jammu to Lal Chowk and Rajbagh in Srinagar, and Katra, Udhampur, Anantnag and Baramulla.",
    lede: "Paste your website or Instagram. Weblyy checks it like a customer would, keeps your prices, photos and contact details, and rebuilds it for phones, with an AI assistant that answers questions in English and Hinglish, even when you're busy or closed.",
    kinds: ["hotel", "clinic", "coaching", "salon", "restaurant"],
  },
  mumbai: {
    title: "Mumbai",
    from: "From Colaba and Dadar to Andheri, Powai and Borivali, and across Thane and Navi Mumbai.",
    lede: "Paste your website or Instagram. Weblyy checks it like a customer would, keeps your prices, photos and contact details, and rebuilds it for phones, with an AI assistant that answers customers in English and Hinglish, day and night.",
    kinds: ["salon", "clinic", "cafe", "coaching", "gym"],
  },
};

export async function generateMetadata({ params }: PageProps<"/[region]">): Promise<Metadata> {
  const { region } = await params;
  const r = regionByKey(region);
  if (!r) return {};
  const c = COPY[r.key];
  const title = `AI-ready websites for ${c.title} businesses | Weblyy`;
  const description = `Free website check for businesses in ${c.title}. Weblyy keeps your content, rebuilds your site for phones, and adds an AI assistant that answers customers 24/7.`;
  return { title, description, alternates: { canonical: `/${r.key}` }, openGraph: { title, description, url: `/${r.key}` } };
}

export default async function RegionPage({ params }: PageProps<"/[region]">) {
  const { region } = await params;
  const r = regionByKey(region);
  if (!r) notFound();
  const c = COPY[r.key];
  const big = r.cities.filter((x) => x.localities.length);
  const small = r.cities.filter((x) => !x.localities.length);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Weblyy for ${c.title} businesses`,
    provider: { "@type": "Organization", name: "Weblyy", url: siteUrl() },
    areaServed: r.cities.map((x) => ({ "@type": "City", name: x.name, containedInPlace: { "@type": "State", name: x.state } })),
    serviceType: "Website analysis, website redesign and AI customer assistant",
    url: `${siteUrl()}/${r.key}`,
  };

  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} style={{ paddingBottom: 80 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
        <section className={`wrap ${styles.hero}`} aria-labelledby="region-h">
          <p className="kicker">Weblyy in {c.title}</p>
          <h1 id="region-h" className="h-display">
            Make your {c.title} business <span className="em">AI-ready.</span>
          </h1>
          <p className="lede">{c.lede}</p>
          <p className={styles.from}>{c.from}</p>
          <div className={styles.scan}>
            <ScanBar />
          </div>
        </section>

        <section className={`wrap ${landing.section}`} aria-labelledby="areas-h">
          <Reveal>
            <h2 id="areas-h" className="h-section">
              Areas Weblyy <span className="em">understands</span>
            </h2>
            <p className="lede">
              Addresses from these places are read exactly: the locality and city show on your new website, and search engines get your city, state and PIN code in the right fields.
            </p>
          </Reveal>
          <div className={styles.cities}>
            {big.map((city) => (
              <div key={city.name} className={styles.city}>
                <h3>
                  {city.name} <small>{city.state}</small>
                </h3>
                <ul>
                  {city.localities.map((l) => (
                    <li key={l}>
                      <Link href={`/find?q=${encodeURIComponent(`${c.kinds[0]} ${l} ${city.name}`)}`}>{l}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {small.length > 0 && (
              <div className={styles.city}>
                <h3>More cities</h3>
                <ul>
                  {small.map((city) => (
                    <li key={city.name}>
                      <Link href={`/find?q=${encodeURIComponent(`${c.kinds[0]} ${city.name}`)}`}>{city.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className={styles.hint}>
            Tap an area to look up businesses there, or search for a kind of business:{" "}
            {c.kinds.map((k, i) => (
              <span key={k}>
                {i > 0 && " · "}
                <Link href={`/find?q=${encodeURIComponent(`${k} ${big[0]?.name ?? c.title}`)}`}>
                  {k} in {big[0]?.name ?? c.title}
                </Link>
              </span>
            ))}
          </p>
        </section>

        <section className={`wrap ${landing.section}`} aria-labelledby="next-h">
          <div className={styles.next}>
            <div>
              <h2 id="next-h" className="h-section" style={{ marginBottom: 8 }}>
                Not technical? <span className="em">We set it up for you.</span>
              </h2>
              <p className="lede">Our team connects Weblyy to your website and WhatsApp on a quick call. Free.</p>
            </div>
            <div className="chips">
              <Link className="btn btn-primary" href="/setup">
                Book a free setup call <Arrow />
              </Link>
              <Link className="btn btn-ghost" href="/how">
                How it works
              </Link>
            </div>
          </div>
          <nav className={styles.others} aria-label="Other regions">
            {REGIONS.filter((x) => x.key !== r.key).map((x) => (
              <Link key={x.key} href={`/${x.key}`}>
                Weblyy in {COPY[x.key].title} →
              </Link>
            ))}
          </nav>
        </section>
      </main>
      <Footer />
    </>
  );
}
