"use client";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const EXAMPLE_TEXT = `Nome: Arthur Poggy
Email: arthur@email.com
Telefone: (11) 99999-9999
LinkedIn: linkedin.com/in/arthur
Localização: São Paulo, Brasil
Resumo: Desenvolvedor full-stack com 4 anos de experiência em React, Node.js e TypeScript, focado em performance e experiência do usuário.

Experiência:
- Empresa Exemplo | Desenvolvedor Full-Stack | Jan 2022 - Presente
  Desenvolvi aplicações web usando React e Node.js. Reduzi o tempo de carregamento em 40%. Liderei equipe de 3 devs.

- Outra Empresa | Desenvolvedor Front-End | Mar 2020 - Dez 2021
  Criei interfaces responsivas com React e Tailwind. Aumentei a retenção de usuários em 25%.

Educação:
- Universidade Exemplo | Bacharelado em Ciência da Computação | 2016 - 2020 | GPA 3.8

Projetos:
- Open Source Library | 2023 | Biblioteca TypeScript com 500+ estrelas no GitHub para validação de formulários.

Habilidades: React (expert), TypeScript (avançado), Node.js (avançado), SQL (intermediário), Docker (intermediário), Git (expert)`;

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function JsonToPdfPage() {
  const [tab, setTab] = useState<"ai" | "json">("ai");

  // AI tab state
  const [rawText, setRawText] = useState("");
  const [generatedJson, setGeneratedJson] = useState("");
  const [aiStatus, setAiStatus] = useState<Status>("idle");
  const [aiError, setAiError] = useState("");

  // JSON tab state
  const [jsonInput, setJsonInput] = useState("");

  // PDF generation (shared)
  const [pdfStatus, setPdfStatus] = useState<Status>("idle");
  const [pdfError, setPdfError] = useState("");

  const handleGenerateJson = async () => {
    setAiStatus("loading");
    setAiError("");
    setGeneratedJson("");
    setPdfStatus("idle");
    setPdfError("");

    try {
      const res = await fetch("/api/generate-resume-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      setGeneratedJson(JSON.stringify(data.resume, null, 2));
      setAiStatus("success");
    } catch (err) {
      setAiStatus("error");
      setAiError(
        err instanceof Error ? err.message : "Erro desconhecido ao chamar IA."
      );
    }
  };

  const handleGeneratePdf = async (jsonStr: string) => {
    setPdfStatus("loading");
    setPdfError("");

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      setPdfStatus("error");
      setPdfError("JSON inválido. Verifique a sintaxe e tente novamente.");
      return;
    }

    try {
      const body =
        parsed !== null &&
        typeof parsed === "object" &&
        "resume" in (parsed as object)
          ? parsed
          : { resume: parsed };

      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error ||
            `Erro ${res.status}: ${res.statusText}`
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const contentDisposition = res.headers.get("Content-Disposition") || "";
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      const fileName = match ? match[1] : "resume.pdf";

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setPdfStatus("success");
    } catch (err) {
      setPdfStatus("error");
      setPdfError(
        err instanceof Error ? err.message : "Erro desconhecido ao gerar PDF."
      );
    }
  };

  const activeJson = tab === "ai" ? generatedJson : jsonInput;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Currículo com IA → PDF
        </h1>
        <p className="mt-2 text-gray-500">
          Descreva sua experiência em texto livre e a IA gera o currículo ATS
          otimizado para você.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setTab("ai")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "ai"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Gerar com IA
        </button>
        <button
          onClick={() => setTab("json")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "json"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Colar JSON
        </button>
      </div>

      {/* Tab: Gerar com IA */}
      {tab === "ai" && (
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                  1
                </span>
                <span className="text-sm font-medium text-gray-700">
                  Descreva seu currículo em texto livre
                </span>
              </div>
              <button
                onClick={() => {
                  setRawText(EXAMPLE_TEXT);
                  setAiStatus("idle");
                  setAiError("");
                }}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Ver exemplo
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setAiStatus("idle");
                setAiError("");
              }}
              placeholder={`Escreva livremente sobre sua experiência. Por exemplo:\n\nNome: João Silva\nEmail: joao@email.com\nTelefone: (11) 98765-4321\n\nTrabalho na Empresa X como Engenheiro de Software desde 2021.\nAntes trabalhei na Empresa Y por 2 anos como dev front-end.\n\nFormado em Ciência da Computação pela USP em 2019.\n\nSkills: React, TypeScript, Python, AWS...`}
              className="h-56 w-full resize-none p-4 text-sm text-gray-800 outline-none placeholder:text-gray-400"
              spellCheck={false}
            />
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <div className="text-sm">
                {aiStatus === "error" && (
                  <p className="text-red-500">{aiError}</p>
                )}
                {aiStatus === "success" && (
                  <p className="text-green-600 font-medium">
                    JSON gerado! Revise abaixo e clique em Gerar PDF.
                  </p>
                )}
              </div>
              <button
                onClick={handleGenerateJson}
                disabled={!rawText.trim() || aiStatus === "loading"}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {aiStatus === "loading" ? (
                  <>
                    <SpinnerIcon />
                    Gerando com IA...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Gerar JSON com IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2 — aparece após IA gerar */}
          {generatedJson && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                    2
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    Revise o JSON gerado (editável)
                  </span>
                </div>
              </div>
              <textarea
                value={generatedJson}
                onChange={(e) => setGeneratedJson(e.target.value)}
                className="h-80 w-full resize-none p-4 font-mono text-xs text-gray-800 outline-none"
                spellCheck={false}
              />
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <div className="text-sm">
                  {pdfStatus === "error" && (
                    <p className="text-red-500">{pdfError}</p>
                  )}
                  {pdfStatus === "success" && (
                    <p className="text-green-600 font-medium">
                      PDF baixado com sucesso!
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleGeneratePdf(generatedJson)}
                  disabled={pdfStatus === "loading"}
                  className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {pdfStatus === "loading" ? (
                    <>
                      <SpinnerIcon />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                        />
                      </svg>
                      Gerar e baixar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Colar JSON */}
      {tab === "json" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              JSON do currículo
            </span>
            {jsonInput && (
              <button
                onClick={() => {
                  setJsonInput("");
                  setPdfStatus("idle");
                  setPdfError("");
                }}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setPdfStatus("idle");
              setPdfError("");
            }}
            placeholder={`Cole aqui o JSON do currículo...\n\nFormato:\n{\n  "resume": { "profile": {...}, "workExperiences": [...], ... },\n  "settings": { "formToShow": { "projects": false } }  // opcional\n}`}
            className="h-[420px] w-full resize-none p-4 font-mono text-sm text-gray-800 outline-none placeholder:text-gray-400"
            spellCheck={false}
          />
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <div className="text-sm">
              {pdfStatus === "error" && (
                <p className="text-red-500">{pdfError}</p>
              )}
              {pdfStatus === "success" && (
                <p className="text-green-600 font-medium">
                  PDF baixado com sucesso!
                </p>
              )}
            </div>
            <button
              onClick={() => handleGeneratePdf(jsonInput)}
              disabled={!jsonInput.trim() || pdfStatus === "loading"}
              className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {pdfStatus === "loading" ? (
                <>
                  <SpinnerIcon />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                  Gerar e baixar PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Schema de referência */}
      <details className="mt-6 rounded-xl border border-gray-200 bg-gray-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 select-none">
          Ver estrutura completa do JSON
        </summary>
        <pre className="overflow-x-auto px-4 pb-4 pt-2 text-xs text-gray-600 leading-relaxed">
          {`{
  "resume": {
    "profile": {
      "name": "string",
      "email": "string",
      "phone": "string",
      "url": "string",        // LinkedIn, GitHub, portfólio
      "summary": "string",
      "location": "string"
    },
    "workExperiences": [
      {
        "company": "string",
        "jobTitle": "string",
        "date": "string",     // Ex: "Jan 2020 - Dez 2021"
        "descriptions": ["string"]
      }
    ],
    "educations": [
      {
        "school": "string",
        "degree": "string",
        "date": "string",
        "gpa": "string",
        "descriptions": []
      }
    ],
    "projects": [
      {
        "project": "string",
        "date": "string",
        "descriptions": ["string"]
      }
    ],
    "skills": {
      "featuredSkills": [
        { "skill": "string", "rating": 1-5 }  // máx 6 itens
      ],
      "descriptions": ["string"]
    },
    "custom": { "descriptions": [] }
  },
  "settings": {               // opcional — omitir usa os padrões
    "themeColor": "#38bdf8",  // cor do cabeçalho (hex)
    "fontFamily": "Roboto",   // Roboto, Lato, Montserrat...
    "fontSize": "11",         // tamanho base em pt (8–11)
    "documentSize": "Letter", // "Letter" ou "A4"
    "formToShow": {
      "workExperiences": true,
      "educations": true,
      "projects": true,       // false = esconde a seção
      "skills": true,
      "custom": false
    }
  }
}`}
        </pre>
      </details>
    </main>
  );
}
