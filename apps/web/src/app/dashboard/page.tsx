import { MyDashboards } from "@/components/my-dashboards";
import { Nav } from "@/components/ui";

export const metadata = { title: "Your dashboard | Weblyy", robots: { index: false } };

export default function DashboardIndex() {
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} className="wrap" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <MyDashboards />
      </main>
    </>
  );
}
