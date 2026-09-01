export interface ExtractedPdfText {
  text: string;
  pageCount: number;
}

export interface RenderedPdfPages {
  pages: string[];
  pageCount: number;
}

export async function extractPdfText(pdfBuffer: Buffer): Promise<ExtractedPdfText> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const result = await parser.getText();
    return {
      text: (result.text || "")
        .replace(/(?:^|\n)\s*--\s*\d+\s+of\s+\d+\s*--\s*(?=\n|$)/gi, "\n")
        .trim(),
      pageCount: result.total || 0,
    };
  } finally {
    await parser.destroy();
  }
}

export async function renderPdfPages(pdfBuffer: Buffer, maxPages = 5): Promise<RenderedPdfPages> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const info = await parser.getInfo();
    const pageCount = info.total || 0;
    const pageNumbers = Array.from(
      { length: Math.min(Math.max(pageCount, 1), maxPages) },
      (_, index) => index + 1,
    );
    const result = await parser.getScreenshot({
      scale: 1.5,
      partial: pageNumbers,
    });
    return {
      pages: result.pages.map((page) => Buffer.from(page.data).toString("base64")),
      pageCount: result.total || pageCount,
    };
  } finally {
    await parser.destroy();
  }
}