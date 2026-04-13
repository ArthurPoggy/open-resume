import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import ReactPDF, { Font, Page, View, Document } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { ResumePDFProfile } from "components/Resume/ResumePDF/ResumePDFProfile";
import { ResumePDFWorkExperience } from "components/Resume/ResumePDF/ResumePDFWorkExperience";
import { ResumePDFEducation } from "components/Resume/ResumePDF/ResumePDFEducation";
import { ResumePDFProject } from "components/Resume/ResumePDF/ResumePDFProject";
import { ResumePDFSkills } from "components/Resume/ResumePDF/ResumePDFSkills";
import { ResumePDFCustom } from "components/Resume/ResumePDF/ResumePDFCustom";
import { DEFAULT_FONT_COLOR, initialSettings } from "lib/redux/settingsSlice";
import type { Settings, ShowForm } from "lib/redux/settingsSlice";
import type { Resume } from "lib/redux/types";
import { ENGLISH_FONT_FAMILIES } from "components/fonts/constants";

// --- Font registration (runs once at module load) ---
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  ENGLISH_FONT_FAMILIES.forEach((fontFamily) => {
    Font.register({
      family: fontFamily,
      fonts: [
        { src: path.join(fontsDir, `${fontFamily}-Regular.ttf`) },
        {
          src: path.join(fontsDir, `${fontFamily}-Bold.ttf`),
          fontWeight: "bold",
        },
      ],
    });
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

// --- PDF Document component (server-side, isPDF=true) ---
const ResumePDFDocument = ({
  resume,
  settings,
}: {
  resume: Resume;
  settings: Settings;
}) => {
  const { profile, workExperiences, educations, projects, skills, custom } =
    resume;
  const {
    fontFamily,
    fontSize,
    documentSize,
    formToHeading,
    formToShow,
    formsOrder,
    showBulletPoints,
  } = settings;
  const themeColor = settings.themeColor || DEFAULT_FONT_COLOR;
  const showFormsOrder = formsOrder.filter((form) => formToShow[form]);

  const formTypeToComponent: { [type in ShowForm]: () => JSX.Element } = {
    workExperiences: () => (
      <ResumePDFWorkExperience
        heading={formToHeading["workExperiences"]}
        workExperiences={workExperiences}
        themeColor={themeColor}
      />
    ),
    educations: () => (
      <ResumePDFEducation
        heading={formToHeading["educations"]}
        educations={educations}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["educations"]}
      />
    ),
    projects: () => (
      <ResumePDFProject
        heading={formToHeading["projects"]}
        projects={projects}
        themeColor={themeColor}
      />
    ),
    skills: () => (
      <ResumePDFSkills
        heading={formToHeading["skills"]}
        skills={skills}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["skills"]}
      />
    ),
    custom: () => (
      <ResumePDFCustom
        heading={formToHeading["custom"]}
        custom={custom}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["custom"]}
      />
    ),
  };

  return (
    <Document
      title={`${profile.name} Resume`}
      author={profile.name}
      producer="OpenResume"
    >
      <Page
        size={documentSize === "A4" ? "A4" : "LETTER"}
        style={{
          ...styles.flexCol,
          color: DEFAULT_FONT_COLOR,
          fontFamily,
          fontSize: fontSize + "pt",
        }}
      >
        {Boolean(settings.themeColor) && (
          <View
            style={{
              width: spacing["full"],
              height: spacing[3.5],
              backgroundColor: themeColor,
            }}
          />
        )}
        <View
          style={{
            ...styles.flexCol,
            padding: `${spacing[0]} ${spacing[20]}`,
          }}
        >
          <ResumePDFProfile
            profile={profile}
            themeColor={themeColor}
            isPDF={true}
          />
          {showFormsOrder.map((form) => {
            const Component = formTypeToComponent[form];
            return <Component key={form} />;
          })}
        </View>
      </Page>
    </Document>
  );
};

// --- Merge user settings with defaults ---
function mergeSettings(partial?: Partial<Settings>): Settings {
  if (!partial) return initialSettings;
  return {
    ...initialSettings,
    ...partial,
    formToShow: { ...initialSettings.formToShow, ...partial.formToShow },
    formToHeading: {
      ...initialSettings.formToHeading,
      ...partial.formToHeading,
    },
    formsOrder: partial.formsOrder ?? initialSettings.formsOrder,
    showBulletPoints: {
      ...initialSettings.showBulletPoints,
      ...partial.showBulletPoints,
    },
  };
}

// --- One-page enforcement helpers ---
const MIN_FONT_SIZE = 8;

async function renderToBuffer(
  resume: Resume,
  settings: Settings
): Promise<Buffer> {
  const stream = await ReactPDF.renderToStream(
    <ResumePDFDocument resume={resume} settings={settings} />
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Conta páginas contando objetos /Type /Page no binário do PDF.
 * A regex exclui /Type /Pages (nó pai) com o lookahead negativo.
 */
function getPageCount(buffer: Buffer): number {
  const content = buffer.toString("latin1");
  const matches = content.match(/\/Type\s*\/Page(?!\s*s\b)/g);
  return matches ? matches.length : 1;
}

/**
 * Renderiza o PDF reduzindo o fontSize em 1pt por vez até caber em 1 página.
 * Se mesmo no tamanho mínimo ainda ultrapassar, retorna o melhor resultado possível.
 */
async function renderFitOnePage(
  resume: Resume,
  settings: Settings
): Promise<{ buffer: Buffer; fontSize: number; pageCount: number }> {
  let fontSize = parseInt(settings.fontSize, 10) || 11;

  while (fontSize >= MIN_FONT_SIZE) {
    const current = { ...settings, fontSize: String(fontSize) };
    const buffer = await renderToBuffer(resume, current);
    const pageCount = getPageCount(buffer);

    if (pageCount <= 1) {
      return { buffer, fontSize, pageCount };
    }

    console.log(
      `generate-pdf: ${pageCount} página(s) com fontSize ${fontSize}pt — reduzindo...`
    );
    fontSize -= 1;
  }

  // Mínimo atingido: retorna o que tiver mesmo que passe de 1 página
  const buffer = await renderToBuffer(resume, {
    ...settings,
    fontSize: String(MIN_FONT_SIZE),
  });
  const pageCount = getPageCount(buffer);
  console.warn(
    `generate-pdf: não foi possível reduzir para 1 página (${pageCount} páginas com ${MIN_FONT_SIZE}pt)`
  );
  return { buffer, fontSize: MIN_FONT_SIZE, pageCount };
}

// --- API handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido. Use POST." });
  }

  try {
    const { resume, settings: partialSettings } = req.body as {
      resume: Resume;
      settings?: Partial<Settings>;
    };

    if (!resume || !resume.profile) {
      return res.status(400).json({
        error: "Campo 'resume' com 'profile' e obrigatorio no body",
      });
    }

    registerFonts();

    const settings = mergeSettings(partialSettings);
    const { buffer, fontSize, pageCount } = await renderFitOnePage(
      resume,
      settings
    );

    const fileName = `${resume.profile.name || "resume"} - Resume.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-Page-Count", String(pageCount));
    res.setHeader("X-Font-Size-Used", String(fontSize));
    res.end(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("generate-pdf error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}
