import mammoth from "mammoth";
import xlsx from "xlsx";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Convert to file:// URL for Windows compatibility
const workerPath = pathToFileURL(
  path.join(__dirname, "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

// Set worker source properly
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

export const extractContent = async (file) => {
  const { buffer, mimetype } = file;

  try {
    switch (mimetype) {
      case "application/pdf": {
        try {
          // Step 1: Load PDF using pdfjs-dist
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
          });
          const pdf = await loadingTask.promise;

          let extractedText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            extractedText +=
              content.items.map((item) => item.str).join(" ") + "\n";
          }

          if (extractedText.trim().length > 0) {
            console.log("✅ Extracted text using pdfjs-dist.");
            return {
              text: extractedText,
              pageCount: pdf.numPages,
              method: "pdfjs",
            };
          }

          // Step 2: If no text found, fallback to OCR
          console.log("⚠️ No selectable text found. Running OCR...");

          const {
            data: { text: ocrText },
          } = await Tesseract.recognize(buffer, "eng", {
            logger: (m) => console.log(m),
          });

          console.log("✅ Extracted text using OCR.");
          return {
            text: ocrText,
            pageCount: 0,
            method: "ocr",
          };
        } catch (pdfError) {
          console.error("❌ PDF extraction error:", pdfError);
          throw pdfError;
        }
      }

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        // DOCX extraction
        const { value: docxText } = await mammoth.extractRawText({ buffer });
        return { text: docxText, method: "mammoth" };
      }

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        // XLSX extraction
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return {
          data: xlsx.utils.sheet_to_json(worksheet),
          method: "xlsx",
        };
      }

      default:
        return { error: `Unsupported file type: ${mimetype}` };
    }
  } catch (error) {
    console.error(
      `❌ Error extracting content from ${file.originalname}:`,
      error
    );
    return { error: "Failed to process file." };
  }
};
