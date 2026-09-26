import { FindResults } from "@/components/find-results";
import { Nav } from "@/components/ui";

export const metadata = { title: "Find a business | FlowScout" };

export default async function FindPage({ searchParams }: PageProps<"/find">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 120) : "";
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1}>
        <FindResults key={query} q={query} />
      </main>
    </>
  );
}
