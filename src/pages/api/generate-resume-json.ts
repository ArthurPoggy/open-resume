import type { NextApiRequest, NextApiResponse } from "next";
import Groq from "groq-sdk";

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist.
Your job is to convert raw resume information into a structured JSON object.

IMPORTANT RULES:
- Output ONLY valid JSON, no markdown, no explanation, no code blocks
- Write all descriptions as strong ATS-friendly bullet points (action verb + metric/result when possible)
- Keep descriptions concise and impactful (1-2 lines each)
- Rate skills from 1 to 5 based on how much the user emphasizes them (5 = expert, 1 = basic)
- Include at most 6 featuredSkills
- If information is missing for a field, use an empty string "" or empty array []
- Preserve the original language of the input (if Portuguese, write in Portuguese; if English, write in English)

OUTPUT FORMAT (strict JSON, no extra fields):
{
  "profile": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "url": "string",
    "summary": "string",
    "location": "string"
  },
  "workExperiences": [
    {
      "company": "string",
      "jobTitle": "string",
      "date": "string",
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
      { "skill": "string", "rating": 4 }
    ],
    "descriptions": ["string"]
  },
  "custom": {
    "descriptions": []
  }
}`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  const { text } = req.body as { text?: string };

  if (!text || text.trim().length < 10) {
    return res
      .status(400)
      .json({ error: "Forneça o texto do currículo no campo 'text'." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "GROQ_API_KEY não configurada. Adicione a variável de ambiente no Vercel.",
    });
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Convert the following resume information to JSON:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "A IA retornou um JSON inválido. Tente novamente.",
        raw,
      });
    }

    return res.status(200).json({ resume: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("generate-resume-json error:", err);
    return res.status(500).json({ error: message });
  }
}
