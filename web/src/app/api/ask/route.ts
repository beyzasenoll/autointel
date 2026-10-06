import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const GEMINI_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. READ USER QUESTION
    // --------------------------------------------------

    const body = await request.json();
    const question = body?.question;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        {
          error: "Question is required.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------
    // 2. CHECK GEMINI API KEY
    // --------------------------------------------------

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured.",
        },
        {
          status: 500,
        },
      );
    }

    // --------------------------------------------------
    // 3. LOAD STRUCTURED AUTOMOTIVE DATA
    // --------------------------------------------------

    const [
      riskResult,
      componentResult,
      recallResult,
    ] = await Promise.all([
      supabase
        .from("vw_vehicle_risk")
        .select("*")
        .order("signal_rank", {
          ascending: true,
        })
        .limit(10),

      supabase
        .from("vw_component_complaint_stats")
        .select("*")
        .order("complaint_count", {
          ascending: false,
        })
        .limit(20),

      supabase
        .from("vw_recent_recalls")
        .select("*")
        .order("report_received_date", {
          ascending: false,
        })
        .limit(20),
    ]);

    // --------------------------------------------------
    // 4. CHECK SUPABASE ERRORS
    // --------------------------------------------------

    const databaseError =
      riskResult.error ||
      componentResult.error ||
      recallResult.error;

    if (databaseError) {
      console.error(
        "AutoIntel database error:",
        databaseError,
      );

      return NextResponse.json(
        {
          error:
            "Could not load automotive data context.",

          debug: {
            riskError:
              riskResult.error?.message ?? null,

            componentError:
              componentResult.error?.message ??
              null,

            recallError:
              recallResult.error?.message ??
              null,
          },
        },
        {
          status: 500,
        },
      );
    }

    const vehicleRisk =
      riskResult.data ?? [];

    const components =
      componentResult.data ?? [];

    const recalls =
      recallResult.data ?? [];

    // --------------------------------------------------
    // 5. BUILD GEMINI CONTEXT
    // --------------------------------------------------

    const prompt = `
You are AutoIntel AI, an automotive data intelligence assistant.

Your responsibility is to answer the user's question using ONLY the structured automotive data supplied below.

RULES:

1. Treat the supplied structured data as the source of truth.

2. Do not invent:
   - statistics
   - complaint counts
   - recall counts
   - injuries
   - crash reports
   - fire reports
   - vehicle facts

3. If the supplied data does not contain enough information to answer the question, clearly say that the available data is insufficient.

4. signal_score is a heuristic prioritization indicator.

5. signal_score is NOT a predictive risk model and must never be described as one.

6. A higher signal_score means that the vehicle should receive higher priority for further investigation.

7. When discussing a vehicle's signal score, explain the measurable factors contributing to that score whenever possible.

8. Use actual figures from the supplied data.

9. Clearly distinguish:
   - customer complaints
   - recalls
   - crash-related complaints
   - fire-related complaints
   - injuries

10. Keep answers concise, analytical, professional and business-friendly.

11. Do not provide unsupported conclusions.

VEHICLE RISK DATA:

${JSON.stringify(vehicleRisk, null, 2)}

TOP COMPONENT COMPLAINT DATA:

${JSON.stringify(components, null, 2)}

RECENT RECALL DATA:

${JSON.stringify(recalls, null, 2)}

USER QUESTION:

${question}
`.trim();

    // --------------------------------------------------
    // 6. CALL GEMINI WITH MODEL FALLBACK
    // --------------------------------------------------

    let finalData: any = null;
    let usedModel: string | null = null;

    let lastErrorMessage =
      "Gemini API request failed.";

    let lastStatus = 503;

    for (const model of GEMINI_MODELS) {
      const controller =
        new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        25000,
      );

      try {
        console.log(
          `Trying Gemini model: ${model}`,
        );

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-goog-api-key":
                apiKey,
            },

            body: JSON.stringify({
              contents: [
                {
                  role: "user",

                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
            }),

            signal:
              controller.signal,
          },
        );

        const data =
          await response.json();

        // Successful Gemini response
        if (response.ok) {
          finalData = data;
          usedModel = model;

          console.log(
            `Gemini success: ${model}`,
          );

          break;
        }

        // Gemini returned an error
        lastStatus =
          response.status;

        lastErrorMessage =
          data?.error?.message ??
          "Gemini API request failed.";

        console.error(
          `Gemini model ${model} failed:`,
          response.status,
          lastErrorMessage,
        );

        // Temporary errors:
        // try next Gemini model.
        if (
          response.status === 503 ||
          response.status === 429
        ) {
          continue;
        }

        // Permanent/non-temporary error:
        // don't continue trying models.
        break;
      } catch (error) {
        // Model timeout
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          lastErrorMessage =
            `${model} request timed out.`;

          lastStatus = 504;

          console.error(
            lastErrorMessage,
          );

          // Try next model
          continue;
        }

        // Other fetch/runtime error
        lastErrorMessage =
          error instanceof Error
            ? error.message
            : "Gemini request failed.";

        lastStatus = 500;

        console.error(
          `Gemini model ${model} error:`,
          error,
        );

        // Try next model
        continue;
      } finally {
        clearTimeout(timeout);
      }
    }

    // --------------------------------------------------
    // 7. ALL GEMINI MODELS FAILED
    // --------------------------------------------------

    if (
      !finalData ||
      !usedModel
    ) {
      return NextResponse.json(
        {
          error:
            lastErrorMessage,

          debug: {
            riskRows:
              vehicleRisk.length,

            componentRows:
              components.length,

            recallRows:
              recalls.length,

            modelsTried:
              GEMINI_MODELS,
          },
        },
        {
          status:
            lastStatus,
        },
      );
    }

    // --------------------------------------------------
    // 8. EXTRACT GEMINI ANSWER
    // --------------------------------------------------

    const answer =
      finalData?.candidates?.[0]
        ?.content?.parts
        ?.map(
          (part: { text?: string }) =>
            part.text ?? "",
        )
        .join("\n")
        .trim();

    if (!answer) {
      return NextResponse.json(
        {
          error:
            "Gemini returned an empty response.",

          debug: {
            model:
              usedModel,

            riskRows:
              vehicleRisk.length,

            componentRows:
              components.length,

            recallRows:
              recalls.length,
          },
        },
        {
          status: 502,
        },
      );
    }

    // --------------------------------------------------
    // 9. RETURN AUTOINTERL AI RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      answer,

      debug: {
        model:
          usedModel,

        riskRows:
          vehicleRisk.length,

        componentRows:
          components.length,

        recallRows:
          recalls.length,
      },
    });
  } catch (error) {
    // --------------------------------------------------
    // 10. UNEXPECTED ROUTE ERROR
    // --------------------------------------------------

    console.error(
      "AutoIntel AI route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AutoIntel AI could not generate a response.",
      },
      {
        status: 500,
      },
    );
  }
}