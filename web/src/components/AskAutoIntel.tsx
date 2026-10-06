"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Props = {
  manufacturer: string;
  model: string;
  year: string;
};

const suggestedQuestions = [
  "Which vehicle should I investigate first and why?",
  "What are the top complaint components?",
  "Summarize the most important recent recalls.",
  "Why is the highest ranked vehicle prioritized?",
];

export default function AskAutoIntel({
  manufacturer,
  model,
  year,
}: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askAutoIntel(selectedQuestion?: string) {
    const userQuestion = selectedQuestion ?? question;

    if (!userQuestion.trim() || loading) {
      return;
    }

    setQuestion(userQuestion);
    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const filterContext = `
Current dashboard filters:
Manufacturer: ${manufacturer}
Model: ${model}
Year: ${year}

Question:
${userQuestion}
      `.trim();

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: filterContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "AutoIntel AI request failed.",
        );
      }

      if (!data?.answer) {
        throw new Error(
          "AutoIntel AI returned an empty response.",
        );
      }

      setAnswer(data.answer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AutoIntel AI could not generate a response.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        background:
          "linear-gradient(135deg, #111827 0%, #1e293b 100%)",
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        color: "white",
        boxShadow:
          "0 12px 30px rgba(15, 23, 42, 0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              color: "#93c5fd",
              fontWeight: 700,
              marginBottom: 7,
            }}
          >
            GENERATIVE AI INTELLIGENCE
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
            }}
          >
            Ask AutoIntel AI
          </h2>

          <p
            style={{
              color: "#94a3b8",
              margin: "7px 0 0",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Ask questions about vehicle safety signals,
            complaints, components and recalls.
          </p>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            padding: "7px 11px",
            background:
              "rgba(37, 99, 235, 0.14)",
            border:
              "1px solid rgba(96, 165, 250, 0.25)",
            borderRadius: 999,
            color: "#93c5fd",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          STRUCTURED DATA + GEMINI
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <ContextBadge
          label="Manufacturer"
          value={manufacturer}
        />
        <ContextBadge
          label="Model"
          value={model}
        />
        <ContextBadge
          label="Year"
          value={year}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {suggestedQuestions.map((item) => (
          <button
            key={item}
            type="button"
            disabled={loading}
            onClick={() => askAutoIntel(item)}
            style={{
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#cbd5e1",
              borderRadius: 8,
              padding: "8px 11px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontSize: 12,
              textAlign: "left",
              opacity: loading ? 0.65 : 1,
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        <textarea
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();

              if (!loading) {
                void askAutoIntel();
              }
            }
          }}
          placeholder="Ask a question about the automotive data..."
          rows={3}
          style={{
            flex: "1 1 520px",
            resize: "vertical",
            minHeight: 86,
            border: "1px solid #475569",
            borderRadius: 10,
            background: "#0f172a",
            color: "white",
            padding: "13px 14px",
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
          }}
        />

        <button
          type="button"
          disabled={loading || !question.trim()}
          onClick={() => void askAutoIntel()}
          style={{
            minWidth: 120,
            minHeight: 48,
            border: 0,
            borderRadius: 10,
            background:
              loading || !question.trim()
                ? "#475569"
                : "#2563eb",
            color: "white",
            fontWeight: 700,
            cursor:
              loading || !question.trim()
                ? "not-allowed"
                : "pointer",
            padding: "0 18px",
          }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            background:
              "rgba(127, 29, 29, 0.35)",
            border:
              "1px solid rgba(248, 113, 113, 0.3)",
            borderRadius: 10,
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {answer && (
        <div
          style={{
            marginTop: 18,
            background: "#f8fafc",
            color: "#1e293b",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 14,
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#2563eb",
                letterSpacing: 0.5,
              }}
            >
              AUTOINTEL AI ANALYSIS
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: 11,
              }}
            >
              Based on structured NHTSA data
            </div>
          </div>

          <div
            style={{
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2
                    style={{
                      margin: "18px 0 8px",
                      fontSize: 20,
                    }}
                  >
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h3
                    style={{
                      margin: "18px 0 8px",
                      fontSize: 17,
                    }}
                  >
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h3
                    style={{
                      margin: "18px 0 8px",
                      fontSize: 16,
                    }}
                  >
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p
                    style={{
                      margin: "8px 0",
                    }}
                  >
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul
                    style={{
                      margin: "8px 0 8px 20px",
                      padding: 0,
                    }}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol
                    style={{
                      margin: "8px 0 8px 20px",
                      padding: 0,
                    }}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li
                    style={{
                      marginBottom: 5,
                    }}
                  >
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong
                    style={{
                      fontWeight: 750,
                      color: "#0f172a",
                    }}
                  >
                    {children}
                  </strong>
                ),
                code: ({ children }) => (
                  <code
                    style={{
                      background: "#e2e8f0",
                      borderRadius: 5,
                      padding: "2px 5px",
                      fontSize: 12,
                    }}
                  >
                    {children}
                  </code>
                ),
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          color: "#64748b",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        Safety Signal is a heuristic prioritization
        indicator and should not be interpreted as a
        predictive risk model.
      </div>
    </section>
  );
}

function ContextBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "6px 9px",
        borderRadius: 7,
        background:
          "rgba(255,255,255,0.06)",
        border:
          "1px solid rgba(255,255,255,0.08)",
        fontSize: 11,
      }}
    >
      <span
        style={{
          color: "#64748b",
        }}
      >
        {label}:{" "}
      </span>

      <strong
        style={{
          color: "#e2e8f0",
        }}
      >
        {value}
      </strong>
    </div>
  );
}
