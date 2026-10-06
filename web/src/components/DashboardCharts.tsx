"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type VehicleSummary = {
  manufacturer: string;
  model_name: string;
  model_year: number;
  recall_count: number;
  complaint_count: number;
};

type VehicleRisk = {
  manufacturer: string;
  model_name: string;
  model_year: number;
  signal_score: number;
  signal_rank: number;
};

type DashboardChartsProps = {
  vehicles: VehicleSummary[];
  riskData: VehicleRisk[];
};

export default function DashboardCharts({
  vehicles,
  riskData,
}: DashboardChartsProps) {
  const vehicleChartData = vehicles.map((vehicle) => ({
    name: `${vehicle.model_name} ${vehicle.model_year}`,
    complaints: vehicle.complaint_count,
    recalls: vehicle.recall_count,
  }));

  const riskChartData = riskData
    .slice()
    .sort((a, b) => a.signal_rank - b.signal_rank)
    .slice(0, 7)
    .map((vehicle) => ({
      name: `${vehicle.model_name} ${vehicle.model_year}`,
      score: vehicle.signal_score,
    }));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
        gap: "24px",
      }}
    >
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Complaints vs Recalls
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Model-year level NHTSA activity
          </p>
        </div>

        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={vehicleChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                height={80}
              />

              <YAxis tick={{ fontSize: 12 }} />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="complaints"
                name="Complaints"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />

              <Bar
                dataKey="recalls"
                name="Recalls"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Safety Signal Ranking
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Heuristic prioritization score
          </p>
        </div>

        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <BarChart
              data={riskChartData}
              layout="vertical"
              margin={{
                left: 30,
                right: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />

              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={105}
                tick={{ fontSize: 11 }}
              />

              <Tooltip />

              <Bar
                dataKey="score"
                name="Signal Score"
                fill="#111827"
                radius={[0, 5, 5, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}