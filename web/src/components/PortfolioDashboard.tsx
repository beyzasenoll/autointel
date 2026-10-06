"use client";



import { useMemo, useState, type ReactNode } from "react";

import AskAutoIntel from "./AskAutoIntel";

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



type Vehicle = {

  manufacturer: string;

  model_name: string;

  model_year: number;

  recall_count: number;

  complaint_count: number;

  crash_related_complaints: number;

  fire_related_complaints: number;

  total_injuries: number;

  total_deaths: number;

};



type RiskVehicle = Vehicle & {

  signal_score: number;

  signal_rank: number;

};



type ComponentData = {

  manufacturer: string;

  model_name: string;

  model_year: number;

  component: string;

  complaint_count: number;

  crash_count: number;

  fire_count: number;

  total_injuries: number;

};



type Recall = {

  manufacturer: string;

  model_name: string;

  model_year: number;

  campaign_number: string;

  component: string | null;

  summary: string | null;

  report_received_date: string | null;

};



type IngestionRun = {

  id: string;

  status: string;

  source_name: string;

  started_at: string;

  completed_at: string | null;

  rows_received: number | null;

  rows_inserted: number | null;

  rows_failed: number | null;

};



type Props = {

  vehicles: Vehicle[];

  riskData: RiskVehicle[];

  componentData: ComponentData[];

  recalls: Recall[];

  ingestionRuns: IngestionRun[];

};



type Tab = "overview" | "vehicles" | "recalls";



function formatNumber(value: number | null | undefined) {

  return Number(value ?? 0).toLocaleString("en-US");

}



function shortText(value: string | null, length = 120) {

  if (!value) return "N/A";



  return value.length <= length

    ? value

    : `${value.slice(0, length)}...`;

}



function statusStyle(status: string) {

  if (status === "SUCCESS") {

    return {

      background: "#dcfce7",

      color: "#166534",

    };

  }



  if (status === "FAILED") {

    return {

      background: "#fee2e2",

      color: "#991b1b",

    };

  }



  return {

    background: "#fef3c7",

    color: "#92400e",

  };

}



export default function PortfolioDashboard({

  vehicles,

  riskData,

  componentData,

  recalls,

  ingestionRuns,

}: Props) {

  const [manufacturer, setManufacturer] = useState("ALL");

  const [model, setModel] = useState("ALL");

  const [year, setYear] = useState("ALL");

  const [activeTab, setActiveTab] =

    useState<Tab>("overview");



  const manufacturers = useMemo(

    () =>

      Array.from(

        new Set(

          vehicles.map(

            (vehicle) =>

              vehicle.manufacturer,

          ),

        ),

      ).sort(),

    [vehicles],

  );



  const availableModels = useMemo(

    () =>

      Array.from(

        new Set(

          vehicles

            .filter(

              (vehicle) =>

                manufacturer === "ALL" ||

                vehicle.manufacturer ===

                  manufacturer,

            )

            .map(

              (vehicle) =>

                vehicle.model_name,

            ),

        ),

      ).sort(),

    [vehicles, manufacturer],

  );



  const years = useMemo(

    () =>

      Array.from(

        new Set(

          vehicles.map(

            (vehicle) =>

              vehicle.model_year,

          ),

        ),

      ).sort((a, b) => b - a),

    [vehicles],

  );



  const matchesFilters = (item: {

    manufacturer: string;

    model_name: string;

    model_year: number;

  }) =>

    (manufacturer === "ALL" ||

      item.manufacturer === manufacturer) &&

    (model === "ALL" ||

      item.model_name === model) &&

    (year === "ALL" ||

      item.model_year === Number(year));



  const filteredVehicles = useMemo(

    () =>

      vehicles.filter(matchesFilters),

    [

      vehicles,

      manufacturer,

      model,

      year,

    ],

  );



  const filteredRisk = useMemo(

    () =>

      riskData

        .filter(matchesFilters)

        .slice()

        .sort(

          (a, b) =>

            b.signal_score -

            a.signal_score,

        ),

    [

      riskData,

      manufacturer,

      model,

      year,

    ],

  );



  const filteredComponents = useMemo(

    () =>

      componentData.filter(

        matchesFilters,

      ),

    [

      componentData,

      manufacturer,

      model,

      year,

    ],

  );



  const filteredRecalls = useMemo(

    () =>

      recalls.filter(matchesFilters),

    [

      recalls,

      manufacturer,

      model,

      year,

    ],

  );



  const totals = useMemo(

    () =>

      filteredVehicles.reduce(

        (acc, vehicle) => {

          acc.recalls +=

            vehicle.recall_count;



          acc.complaints +=

            vehicle.complaint_count;



          acc.crashes +=

            vehicle.crash_related_complaints;



          acc.fires +=

            vehicle.fire_related_complaints;



          acc.injuries +=

            vehicle.total_injuries;



          return acc;

        },

        {

          recalls: 0,

          complaints: 0,

          crashes: 0,

          fires: 0,

          injuries: 0,

        },

      ),

    [filteredVehicles],

  );



  const topComponents = useMemo(() => {

    const map = new Map<

      string,

      {

        component: string;

        complaints: number;

        crashes: number;

        fires: number;

        injuries: number;

      }

    >();



    for (const row of filteredComponents) {

      const current =

        map.get(row.component) ?? {

          component: row.component,

          complaints: 0,

          crashes: 0,

          fires: 0,

          injuries: 0,

        };



      current.complaints +=

        row.complaint_count;



      current.crashes +=

        row.crash_count;



      current.fires +=

        row.fire_count;



      current.injuries +=

        row.total_injuries;



      map.set(

        row.component,

        current,

      );

    }



    return Array.from(

      map.values(),

    )

      .sort(

        (a, b) =>

          b.complaints -

          a.complaints,

      )

      .slice(0, 10);

  }, [filteredComponents]);



  const vehicleChartData =

    filteredVehicles.map(

      (vehicle) => ({

        name: `${vehicle.model_name} ${vehicle.model_year}`,

        complaints:

          vehicle.complaint_count,

        recalls:

          vehicle.recall_count,

      }),

    );



  const riskChartData =

    filteredRisk

      .slice(0, 7)

      .map((vehicle) => ({

        name: `${vehicle.model_name} ${vehicle.model_year}`,

        score:

          vehicle.signal_score,

      }));



  const lastSuccessfulRun =

    ingestionRuns.find(

      (run) =>

        run.status === "SUCCESS",

    );



  function resetFilters() {

    setManufacturer("ALL");

    setModel("ALL");

    setYear("ALL");

  }



  function selectManufacturer(

    value: string,

  ) {

    setManufacturer(value);

    setModel("ALL");

  }



  return (

    <main

      style={{

        minHeight: "100vh",

        background: "#f5f7fb",

        color: "#172033",

        fontFamily:

          "Inter, Arial, sans-serif",

      }}

    >

      <header

        style={{

          background: "#111827",

          color: "white",

          padding: "26px 34px",

        }}

      >

        <div

          style={{

            maxWidth: 1500,

            margin: "0 auto",

          }}

        >

          <div

            style={{

              display: "flex",

              justifyContent:

                "space-between",

              alignItems: "center",

              flexWrap: "wrap",

              gap: 20,

            }}

          >

            <div>

              <div

                style={{

                  fontSize: 12,

                  letterSpacing: 1.6,

                  color: "#93c5fd",

                  fontWeight: 700,

                  marginBottom: 8,

                }}

              >

                AUTOMOTIVE INTELLIGENCE

              </div>



              <h1

                style={{

                  margin: 0,

                  fontSize: 30,

                }}

              >

                AutoIntel AI

              </h1>



              <p

                style={{

                  margin:

                    "8px 0 0",

                  color: "#9ca3af",

                }}

              >

                Portfolio Safety &

                Customer Signal

                Intelligence

              </p>

            </div>



            <div

              style={{

                display: "flex",

                gap: 10,

                alignItems:

                  "center",

              }}

            >

              <span

                style={{

                  background:

                    "#052e16",

                  color: "#86efac",

                  padding:

                    "8px 13px",

                  borderRadius: 999,

                  fontSize: 12,

                  fontWeight: 700,

                }}

              >

                ● LIVE DATA

              </span>



              <span

                style={{

                  color: "#9ca3af",

                  fontSize: 12,

                }}

              >

                {lastSuccessfulRun

                  ? `${formatNumber(

                      lastSuccessfulRun.rows_inserted,

                    )} rows loaded`

                  : "No sync data"}

              </span>

            </div>

          </div>

        </div>

      </header>



      <div

        style={{

          maxWidth: 1500,

          margin: "0 auto",

          padding:

            "26px 34px 60px",

        }}

      >

        <section

          style={{

            background: "white",

            border:

              "1px solid #e5e7eb",

            borderRadius: 14,

            padding: 18,

            marginBottom: 22,

            display: "flex",

            gap: 14,

            alignItems: "end",

            flexWrap: "wrap",

          }}

        >

          <Filter

            label="Manufacturer"

            value={manufacturer}

            onChange={

              selectManufacturer

            }

            options={

              manufacturers

            }

          />



          <Filter

            label="Model"

            value={model}

            onChange={setModel}

            options={

              availableModels

            }

          />



          <Filter

            label="Year"

            value={year}

            onChange={setYear}

            options={years.map(

              String,

            )}

          />



          <button

            type="button"

            onClick={resetFilters}

            style={{

              height: 40,

              padding:

                "0 18px",

              border:

                "1px solid #d1d5db",

              borderRadius: 8,

              background:

                "white",

              cursor: "pointer",

              fontWeight: 600,

            }}

          >

            Reset Filters

          </button>



          <div

            style={{

              marginLeft: "auto",

              fontSize: 13,

              color: "#6b7280",

              paddingBottom: 10,

            }}

          >

            {

              filteredVehicles.length

            }{" "}

            model-year records

          </div>

        </section>



        <section

          style={{

            display: "grid",

            gridTemplateColumns:

              "repeat(auto-fit,minmax(165px,1fr))",

            gap: 14,

            marginBottom: 24,

          }}

        >

          <Metric

            label="Vehicles"

            value={

              filteredVehicles.length

            }

            sub="Model-year variants"

          />



          <Metric

            label="Complaints"

            value={

              totals.complaints

            }

            sub="Customer reports"

          />



          <Metric

            label="Recalls"

            value={totals.recalls}

            sub="Campaigns"

          />



          <Metric

            label="Crash Reports"

            value={totals.crashes}

            sub="Crash related"

          />



          <Metric

            label="Fire Reports"

            value={totals.fires}

            sub="Fire related"

          />



          <Metric

            label="Injuries"

            value={totals.injuries}

            sub="Reported"

          />

        </section>



        <AskAutoIntel
          manufacturer={manufacturer}
          model={model}
          year={year}
        />



        <div

          style={{

            display: "flex",

            gap: 6,

            marginBottom: 20,

            borderBottom:

              "1px solid #dfe3ea",

          }}

        >

          <TabButton

            active={

              activeTab ===

              "overview"

            }

            onClick={() =>

              setActiveTab(

                "overview",

              )

            }

          >

            Overview

          </TabButton>



          <TabButton

            active={

              activeTab ===

              "vehicles"

            }

            onClick={() =>

              setActiveTab(

                "vehicles",

              )

            }

          >

            Vehicle Analysis

          </TabButton>



          <TabButton

            active={

              activeTab ===

              "recalls"

            }

            onClick={() =>

              setActiveTab(

                "recalls",

              )

            }

          >

            Recalls & Pipeline

          </TabButton>

        </div>



        {activeTab ===

          "overview" && (

          <>

            <section

              style={{

                display: "grid",

                gridTemplateColumns:

                  "repeat(auto-fit,minmax(430px,1fr))",

                gap: 20,

                marginBottom: 20,

              }}

            >

              <Panel

                title="Complaints vs Recalls"

                subtitle="Model-year comparison"

              >

                <div

                  style={{

                    height: 350,

                  }}

                >

                  <ResponsiveContainer

                    width="100%"

                    height="100%"

                  >

                    <BarChart

                      data={

                        vehicleChartData

                      }

                    >

                      <CartesianGrid

                        strokeDasharray="3 3"

                        vertical={

                          false

                        }

                      />



                      <XAxis

                        dataKey="name"

                        angle={-25}

                        textAnchor="end"

                        height={70}

                        tick={{

                          fontSize: 11,

                        }}

                      />



                      <YAxis />



                      <Tooltip />



                      <Legend />



                      <Bar

                        dataKey="complaints"

                        fill="#2563eb"

                        name="Complaints"

                        radius={[

                          5,

                          5,

                          0,

                          0,

                        ]}

                      />



                      <Bar

                        dataKey="recalls"

                        fill="#93c5fd"

                        name="Recalls"

                        radius={[

                          5,

                          5,

                          0,

                          0,

                        ]}

                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </Panel>



              <Panel

                title="Safety Signal Ranking"

                subtitle="Highest priority model-year signals"

              >

                <div

                  style={{

                    height: 350,

                  }}

                >

                  <ResponsiveContainer

                    width="100%"

                    height="100%"

                  >

                    <BarChart

                      data={

                        riskChartData

                      }

                      layout="vertical"

                    >

                      <CartesianGrid

                        strokeDasharray="3 3"

                        horizontal={

                          false

                        }

                      />



                      <XAxis

                        type="number"

                      />



                      <YAxis

                        type="category"

                        dataKey="name"

                        width={95}

                        tick={{

                          fontSize: 11,

                        }}

                      />



                      <Tooltip />



                      <Bar

                        dataKey="score"

                        fill="#111827"

                        name="Signal Score"

                        radius={[

                          0,

                          5,

                          5,

                          0,

                        ]}

                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </Panel>

            </section>



            <Panel

              title="Top Complaint Components"

              subtitle="Aggregated component signals for the selected portfolio"

            >

              <DataTable>

                <thead>

                  <tr>

                    <Th>

                      Component

                    </Th>



                    <Th>

                      Complaints

                    </Th>



                    <Th>

                      Crashes

                    </Th>



                    <Th>

                      Fires

                    </Th>



                    <Th>

                      Injuries

                    </Th>

                  </tr>

                </thead>



                <tbody>

                  {topComponents.map(

                    (row) => (

                      <tr

                        key={

                          row.component

                        }

                      >

                        <Td bold>

                          {

                            row.component

                          }

                        </Td>



                        <Td>

                          {

                            row.complaints

                          }

                        </Td>



                        <Td>

                          {

                            row.crashes

                          }

                        </Td>



                        <Td>

                          {

                            row.fires

                          }

                        </Td>



                        <Td>

                          {

                            row.injuries

                          }

                        </Td>

                      </tr>

                    ),

                  )}

                </tbody>

              </DataTable>

            </Panel>

          </>

        )}



        {activeTab ===

          "vehicles" && (

          <>

            <Panel

              title="Vehicle Signal Matrix"

              subtitle="Detailed model-year portfolio comparison"

            >

              <DataTable>

                <thead>

                  <tr>

                    <Th>Rank</Th>

                    <Th>Vehicle</Th>

                    <Th>Year</Th>

                    <Th>

                      Complaints

                    </Th>

                    <Th>

                      Recalls

                    </Th>

                    <Th>Crash</Th>

                    <Th>Fire</Th>

                    <Th>

                      Injuries

                    </Th>

                    <Th>

                      Signal Score

                    </Th>

                  </tr>

                </thead>



                <tbody>

                  {filteredRisk.map(

                    (

                      vehicle,

                      index,

                    ) => (

                      <tr

                        key={`${vehicle.manufacturer}-${vehicle.model_name}-${vehicle.model_year}`}

                      >

                        <Td>

                          #

                          {index +

                            1}

                        </Td>



                        <Td bold>

                          {

                            vehicle.manufacturer

                          }{" "}

                          {

                            vehicle.model_name

                          }

                        </Td>



                        <Td>

                          {

                            vehicle.model_year

                          }

                        </Td>



                        <Td>

                          {

                            vehicle.complaint_count

                          }

                        </Td>



                        <Td>

                          {

                            vehicle.recall_count

                          }

                        </Td>



                        <Td>

                          {

                            vehicle.crash_related_complaints

                          }

                        </Td>



                        <Td>

                          {

                            vehicle.fire_related_complaints

                          }

                        </Td>



                        <Td>

                          {

                            vehicle.total_injuries

                          }

                        </Td>



                        <Td bold>

                          {

                            vehicle.signal_score

                          }

                        </Td>

                      </tr>

                    ),

                  )}

                </tbody>

              </DataTable>

            </Panel>



            <div

              style={{

                marginTop: 18,

              }}

            >

              <Panel

                title="Component Detail"

                subtitle="Top complaint components by selected vehicle filters"

              >

                <DataTable>

                  <thead>

                    <tr>

                      <Th>

                        Vehicle

                      </Th>



                      <Th>

                        Year

                      </Th>



                      <Th>

                        Component

                      </Th>



                      <Th>

                        Complaints

                      </Th>



                      <Th>

                        Crashes

                      </Th>



                      <Th>

                        Fires

                      </Th>

                    </tr>

                  </thead>



                  <tbody>

                    {filteredComponents

                      .slice(

                        0,

                        25,

                      )

                      .map(

                        (

                          item,

                          index,

                        ) => (

                          <tr

                            key={`${item.manufacturer}-${item.model_name}-${item.model_year}-${item.component}-${index}`}

                          >

                            <Td bold>

                              {

                                item.manufacturer

                              }{" "}

                              {

                                item.model_name

                              }

                            </Td>



                            <Td>

                              {

                                item.model_year

                              }

                            </Td>



                            <Td>

                              {

                                item.component

                              }

                            </Td>



                            <Td>

                              {

                                item.complaint_count

                              }

                            </Td>



                            <Td>

                              {

                                item.crash_count

                              }

                            </Td>



                            <Td>

                              {

                                item.fire_count

                              }

                            </Td>

                          </tr>

                        ),

                      )}

                  </tbody>

                </DataTable>

              </Panel>

            </div>

          </>

        )}



        {activeTab ===

          "recalls" && (

          <>

            <Panel

              title="Recent Recall Activity"

              subtitle="Latest NHTSA recall campaigns"

            >

              <DataTable>

                <thead>

                  <tr>

                    <Th>

                      Vehicle

                    </Th>



                    <Th>

                      Year

                    </Th>



                    <Th>

                      Campaign

                    </Th>



                    <Th>

                      Component

                    </Th>



                    <Th>

                      Received

                    </Th>



                    <Th>

                      Summary

                    </Th>

                  </tr>

                </thead>



                <tbody>

                  {filteredRecalls

                    .slice(

                      0,

                      20,

                    )

                    .map(

                      (

                        recall,

                        index,

                      ) => (

                        <tr

                          key={`${recall.campaign_number}-${recall.model_name}-${recall.model_year}-${index}`}

                        >

                          <Td bold>

                            {

                              recall.manufacturer

                            }{" "}

                            {

                              recall.model_name

                            }

                          </Td>



                          <Td>

                            {

                              recall.model_year

                            }

                          </Td>



                          <Td>

                            {

                              recall.campaign_number

                            }

                          </Td>



                          <Td>

                            {recall.component ??

                              "N/A"}

                          </Td>



                          <Td>

                            {recall.report_received_date ??

                              "N/A"}

                          </Td>



                          <Td>

                            {shortText(

                              recall.summary,

                            )}

                          </Td>

                        </tr>

                      ),

                    )}

                </tbody>

              </DataTable>

            </Panel>



            <div

              style={{

                marginTop: 18,

              }}

            >

              <Panel

                title="Pipeline Monitoring"

                subtitle="Recent NHTSA ingestion executions"

              >

                <DataTable>

                  <thead>

                    <tr>

                      <Th>

                        Status

                      </Th>



                      <Th>

                        Source

                      </Th>



                      <Th>

                        Started

                      </Th>



                      <Th>

                        Received

                      </Th>



                      <Th>

                        Loaded

                      </Th>



                      <Th>

                        Failed

                      </Th>

                    </tr>

                  </thead>



                  <tbody>

                    {ingestionRuns.map(

                      (run) => (

                        <tr

                          key={

                            run.id

                          }

                        >

                          <Td>

                            <span

                              style={{

                                ...statusStyle(

                                  run.status,

                                ),

                                padding:

                                  "5px 9px",

                                borderRadius:

                                  999,

                                fontSize:

                                  11,

                                fontWeight:

                                  700,

                              }}

                            >

                              {

                                run.status

                              }

                            </span>

                          </Td>



                          <Td bold>

                            {

                              run.source_name

                            }

                          </Td>



                          <Td>

                            {new Date(

                              run.started_at,

                            ).toLocaleString()}

                          </Td>



                          <Td>

                            {formatNumber(

                              run.rows_received,

                            )}

                          </Td>



                          <Td>

                            {formatNumber(

                              run.rows_inserted,

                            )}

                          </Td>



                          <Td>

                            {formatNumber(

                              run.rows_failed,

                            )}

                          </Td>

                        </tr>

                      ),

                    )}

                  </tbody>

                </DataTable>

              </Panel>

            </div>

          </>

        )}

      </div>

    </main>

  );

}



function Filter({

  label,

  value,

  options,

  onChange,

}: {

  label: string;

  value: string;

  options: string[];

  onChange: (

    value: string,

  ) => void;

}) {

  return (

    <label

      style={{

        display: "grid",

        gap: 6,

        minWidth: 170,

      }}

    >

      <span

        style={{

          fontSize: 12,

          color: "#6b7280",

          fontWeight: 600,

        }}

      >

        {label}

      </span>



      <select

        value={value}

        onChange={(event) =>

          onChange(

            event.target.value,

          )

        }

        style={{

          height: 40,

          border:

            "1px solid #d1d5db",

          borderRadius: 8,

          padding: "0 10px",

          background: "white",

          fontSize: 14,

        }}

      >

        <option value="ALL">

          All

        </option>



        {options.map(

          (option) => (

            <option

              key={option}

              value={option}

            >

              {option}

            </option>

          ),

        )}

      </select>

    </label>

  );

}



function Metric({

  label,

  value,

  sub,

}: {

  label: string;

  value: number;

  sub: string;

}) {

  return (

    <article

      style={{

        background: "white",

        border:

          "1px solid #e5e7eb",

        borderRadius: 12,

        padding: "17px 18px",

      }}

    >

      <div

        style={{

          fontSize: 12,

          fontWeight: 700,

          color: "#6b7280",

          textTransform:

            "uppercase",

          letterSpacing: 0.5,

        }}

      >

        {label}

      </div>



      <div

        style={{

          fontSize: 29,

          fontWeight: 750,

          marginTop: 10,

        }}

      >

        {formatNumber(value)}

      </div>



      <div

        style={{

          fontSize: 12,

          color: "#9ca3af",

          marginTop: 5,

        }}

      >

        {sub}

      </div>

    </article>

  );

}



function Panel({

  title,

  subtitle,

  children,

}: {

  title: string;

  subtitle: string;

  children: ReactNode;

}) {

  return (

    <section

      style={{

        background: "white",

        border:

          "1px solid #e5e7eb",

        borderRadius: 14,

        overflow: "hidden",

      }}

    >

      <div

        style={{

          padding: "18px 20px",

          borderBottom:

            "1px solid #edf0f4",

        }}

      >

        <h2

          style={{

            margin: 0,

            fontSize: 17,

          }}

        >

          {title}

        </h2>



        <p

          style={{

            margin: "5px 0 0",

            fontSize: 12,

            color: "#6b7280",

          }}

        >

          {subtitle}

        </p>

      </div>



      <div

        style={{

          padding: 20,

        }}

      >

        {children}

      </div>

    </section>

  );

}



function TabButton({

  active,

  onClick,

  children,

}: {

  active: boolean;

  onClick: () => void;

  children: ReactNode;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      style={{

        border: 0,

        borderBottom: active

          ? "3px solid #2563eb"

          : "3px solid transparent",

        background:

          "transparent",

        padding:

          "12px 16px",

        cursor: "pointer",

        color: active

          ? "#1d4ed8"

          : "#6b7280",

        fontWeight: active

          ? 700

          : 600,

      }}

    >

      {children}

    </button>

  );

}



function DataTable({

  children,

}: {

  children: ReactNode;

}) {

  return (

    <div

      style={{

        overflowX: "auto",

      }}

    >

      <table

        style={{

          width: "100%",

          borderCollapse:

            "collapse",

          minWidth: 720,

        }}

      >

        {children}

      </table>

    </div>

  );

}



function Th({

  children,

}: {

  children: ReactNode;

}) {

  return (

    <th

      style={{

        background: "#f8fafc",

        padding: "11px 12px",

        borderBottom:

          "1px solid #e5e7eb",

        textAlign: "left",

        fontSize: 11,

        color: "#64748b",

        textTransform:

          "uppercase",

        letterSpacing: 0.35,

      }}

    >

      {children}

    </th>

  );

}



function Td({

  children,

  bold = false,

}: {

  children: ReactNode;

  bold?: boolean;

}) {

  return (

    <td

      style={{

        padding: "12px",

        borderBottom:

          "1px solid #f1f5f9",

        fontSize: 13,

        color: "#334155",

        fontWeight: bold

          ? 650

          : 400,

        verticalAlign: "top",

      }}

    >

      {children}

    </td>

  );

}