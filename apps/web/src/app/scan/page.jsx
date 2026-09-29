import { ScanApp } from "@/components/scan/scan-app";
import { Nav } from "@/components/ui";
export const metadata = { title: "Scanning… | Weblyy" };
export default async function ScanPage({ searchParams }) {
  const { url } = await searchParams;
  const target = typeof url === "string" ? url.slice(0, 300) : "";
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1}>
        <ScanApp key={target} url={target} />
      </main>
    </>
  );
}
