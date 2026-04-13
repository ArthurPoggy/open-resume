"use client";
import { useState } from "react";

const EXAMPLE_JSON = {
  profile: {
    name: "Arthur Poggy",
    email: "arthur@email.com",
    phone: "(11) 99999-9999",
    url: "linkedin.com/in/arthur",
    summary:
      "Desenvolvedor full-stack com experiência em React, Node.js e TypeScript.",
    location: "São Paulo, Brasil",
  },
  workExperiences: [
    {
      company: "Empresa Exemplo",
      jobTitle: "Desenvolvedor Full-Stack",
      date: "Jan 2022 - Presente",
      descriptions: [
        "Desenvolveu e manteve aplicações web usando React e Node.js",
        "Reduziu o tempo de carregamento em 40% com otimizações de performance",
      ],
    },
  ],
  educations: [
    {
      school: "Universidade Exemplo",
      degree: "Bacharelado em Ciência da Computação",
      date: "2018 - 2022",
      gpa: "3.8",
      descriptions: [],
    },
  ],
  projects: [
    {
      project: "Projeto Open Source",
      date: "2023",
      descriptions: [
        "Criou uma biblioteca TypeScript com mais de 500 estrelas no GitHub",
      ],
    },
  ],
  skills: {
    featuredSkills: [
      { skill: "React", rating: 5 },
      { skill: "TypeScript", rating: 4 },
      { skill: "Node.js", rating: 4 },
      { skill: "SQL", rating: 3 },
      { skill: "Docker", rating: 3 },
      { skill: "Git", rating: 5 },
    ],
    descriptions: ["Experiência com metodologias ágeis (Scrum, Kanban)"],
  },
  custom: {
    descriptions: [],
  },
};

export default function JsonToPdfPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerate = async () => {
    setStatus("loading");
    setErrorMsg("");

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setStatus("error");
      setErrorMsg("JSON inválido. Verifique a sintaxe e tente novamente.");
      return;
    }

    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: parsed }),
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

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Erro desconhecido ao gerar PDF."
      );
    }
  };

  const handleLoadExample = () => {
    setJsonInput(JSON.stringify(EXAMPLE_JSON, null, 2));
    setStatus("idle");
    setErrorMsg("");
  };

  const handleClear = () => {
    setJsonInput("");
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">JSON → PDF</h1>
        <p className="mt-2 text-gray-500">
          Cole o JSON do seu currículo abaixo e gere o PDF automaticamente.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header da área de input */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-sm font-medium text-gray-700">
            JSON do currículo
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleLoadExample}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Carregar exemplo
            </button>
            {jsonInput && (
              <button
                onClick={handleClear}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setStatus("idle");
            setErrorMsg("");
          }}
          placeholder={`Cole aqui o JSON do currículo...\n\nExemplo de estrutura:\n{\n  "profile": { "name": "...", "email": "...", ... },\n  "workExperiences": [...],\n  "educations": [...],\n  "projects": [...],\n  "skills": { "featuredSkills": [...], "descriptions": [...] },\n  "custom": { "descriptions": [...] }\n}`}
          className="h-[420px] w-full resize-none rounded-b-none p-4 font-mono text-sm text-gray-800 outline-none placeholder:text-gray-400"
          spellCheck={false}
        />

        {/* Footer com botão */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <div className="text-sm">
            {status === "error" && (
              <p className="text-red-500">{errorMsg}</p>
            )}
            {status === "success" && (
              <p className="text-green-600 font-medium">
                PDF gerado e baixado com sucesso!
              </p>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!jsonInput.trim() || status === "loading"}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {status === "loading" ? (
              <>
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

      {/* Schema de referência */}
      <details className="mt-6 rounded-xl border border-gray-200 bg-gray-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 select-none">
          Ver estrutura completa do JSON
        </summary>
        <pre className="overflow-x-auto px-4 pb-4 pt-2 text-xs text-gray-600 leading-relaxed">
          {`{
  "profile": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "url": "string",       // LinkedIn, GitHub, portfólio
    "summary": "string",
    "location": "string"
  },
  "workExperiences": [
    {
      "company": "string",
      "jobTitle": "string",
      "date": "string",    // Ex: "Jan 2020 - Dez 2021"
      "descriptions": ["string"]
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "string",
      "date": "string",
      "gpa": "string",
      "descriptions": ["string"]
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
  "custom": {
    "descriptions": ["string"]
  }
}`}
        </pre>
      </details>
    </main>
  );
}
