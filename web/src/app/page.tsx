import PortfolioDashboard from "../components/PortfolioDashboard";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [
    vehiclesResult,
    riskResult,
    componentsResult,
    recallsResult,
    ingestionResult,
  ] = await Promise.all([
    supabase
      .from("vw_vehicle_summary")
      .select("*")
      .order("manufacturer")
      .order("model_name")
      .order("model_year"),

    supabase
      .from("vw_vehicle_risk")
      .select("*")
      .order("signal_rank"),

    supabase
      .from("vw_component_complaint_stats")
      .select("*")
      .order("complaint_count", {
        ascending: false,
      }),

    supabase
      .from("vw_recent_recalls")
      .select("*")
      .order("report_received_date", {
        ascending: false,
      })
      .limit(50),

    supabase
      .from("vw_ingestion_status")
      .select("*")
      .order("started_at", {
        ascending: false,
      })
      .limit(10),
  ]);

  const error =
    vehiclesResult.error ||
    riskResult.error ||
    componentsResult.error ||
    recallsResult.error ||
    ingestionResult.error;

  if (error) {
    return (
      <main style={{ padding: 40 }}>
        <h1>AutoIntel AI</h1>
        <p>Dashboard data could not be loaded.</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  return (
    <PortfolioDashboard
      vehicles={vehiclesResult.data ?? []}
      riskData={riskResult.data ?? []}
      componentData={componentsResult.data ?? []}
      recalls={recallsResult.data ?? []}
      ingestionRuns={ingestionResult.data ?? []}
    />
  );
}