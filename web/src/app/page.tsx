import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data, error } = await supabase
    .from("vw_vehicle_summary")
    .select("*")
    .eq("manufacturer", "BMW")
    .eq("model_name", "X3")
    .eq("model_year", 2021)
    .single();

  const { data: components, error: componentsError } = await supabase
    .from("vw_component_complaint_stats")
    .select("*")
    .eq("manufacturer", "BMW")
    .eq("model_name", "X3")
    .eq("model_year", 2021)
    .order("complaint_count", { ascending: false })
    .limit(8);

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
        <h1>AutoIntel AI</h1>
        <p style={{ color: "crimson" }}>
          Supabase error: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial, sans-serif",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <h1>AutoIntel AI</h1>

      <p style={{ color: "#666" }}>
        Automotive Data Intelligence Platform
      </p>

      <h2 style={{ marginTop: 32 }}>
        {data.model_year} {data.manufacturer} {data.model_name}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginTop: 24,
        }}
      >
        <MetricCard
          title="Recalls"
          value={data.recall_count}
        />

        <MetricCard
          title="Complaints"
          value={data.complaint_count}
        />

        <MetricCard
          title="Crash Reports"
          value={data.crash_related_complaints}
        />

        <MetricCard
          title="Fire Reports"
          value={data.fire_related_complaints}
        />
      </div>

      <section style={{ marginTop: 50 }}>
        <h2>Top Complaint Components</h2>

        {componentsError ? (
          <p style={{ color: "crimson" }}>
            Component data error: {componentsError.message}
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              marginTop: 20,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={headerStyle}>Component</th>
                <th style={headerStyle}>Complaints</th>
                <th style={headerStyle}>Crashes</th>
                <th style={headerStyle}>Fires</th>
                <th style={headerStyle}>Injuries</th>
              </tr>
            </thead>

            <tbody>
              {components?.map((item) => (
                <tr key={item.component}>
                  <td style={cellStyle}>
                    {item.component}
                  </td>

                  <td style={cellStyle}>
                    {item.complaint_count}
                  </td>

                  <td style={cellStyle}>
                    {item.crash_count}
                  </td>

                  <td style={cellStyle}>
                    {item.fire_count}
                  </td>

                  <td style={cellStyle}>
                    {item.total_injuries}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: 20,
        border: "1px solid #ddd",
        borderRadius: 12,
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#666",
          fontSize: 14,
        }}
      >
        {title}
      </p>

      <p
        style={{
          marginTop: 8,
          marginBottom: 0,
          fontSize: 28,
          fontWeight: "bold",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const headerStyle = {
  textAlign: "left" as const,
  padding: 12,
  borderBottom: "2px solid #ddd",
};

const cellStyle = {
  padding: 12,
  borderBottom: "1px solid #eee",
};