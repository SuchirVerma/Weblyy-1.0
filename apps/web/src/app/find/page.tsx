import { FindResults } from "@/components/find-results";
import { Footer, Nav } from "@/components/ui";

export const metadata = { title: "Find a business | Weblyy", description: "Search for any business by name or Instagram handle and check how AI-ready its website is.", alternates: { canonical: "/find" } };

export default async function FindPage({ searchParams }: PageProps<"/find">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 120) : "";
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1}>
        <FindResults key={query} q={query} />
      </main>
      <Footer />
    </>
  );
}
