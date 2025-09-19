import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
// @ts-ignore
import pptx2json from 'pptx2json';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface DocumentProcessResult {
  text: string;
  type: 'pdf' | 'docx' | 'pptx' | 'unsupported';
  error?: string;
}

/**
 * Detecta el tipo de archivo basado en el MIME type
 */
export function getFileType(file: File): 'pdf' | 'docx' | 'pptx' | 'unsupported' {
  const mimeType = file.type;
  
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return 'pptx';
  }
  
  // Fallback: detectar por extensión
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.pdf')) return 'pdf';
  if (fileName.endsWith('.docx')) return 'docx';
  if (fileName.endsWith('.pptx')) return 'pptx';
  
  return 'unsupported';
}

/**
 * Extrae texto de un archivo PDF
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('No se pudo extraer texto del archivo PDF');
  }
}

/**
 * Extrae texto de un archivo Word (.docx)
 */
export async function extractTextFromWord(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from Word:', error);
    throw new Error('No se pudo extraer texto del archivo Word');
  }
}

/**
 * Extrae texto de un archivo PowerPoint (.pptx)
 */
export async function extractTextFromPowerPoint(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await pptx2json.toJson(arrayBuffer);
    
    let fullText = '';
    
    // Extraer texto de todas las diapositivas
    if (result.slides && Array.isArray(result.slides)) {
      result.slides.forEach((slide: any, index: number) => {
        fullText += `Diapositiva ${index + 1}:\n`;
        
        if (slide.elements && Array.isArray(slide.elements)) {
          slide.elements.forEach((element: any) => {
            if (element.type === 'text' && element.text) {
              fullText += element.text + '\n';
            }
          });
        }
        
        fullText += '\n';
      });
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PowerPoint:', error);
    throw new Error('No se pudo extraer texto del archivo PowerPoint');
  }
}

/**
 * Función principal para procesar cualquier tipo de documento
 */
export async function processDocument(file: File): Promise<DocumentProcessResult> {
  const fileType = getFileType(file);
  
  try {
    let text = '';
    
    switch (fileType) {
      case 'pdf':
        text = await extractTextFromPDF(file);
        break;
      case 'docx':
        text = await extractTextFromWord(file);
        break;
      case 'pptx':
        text = await extractTextFromPowerPoint(file);
        break;
      default:
        return {
          text: '',
          type: 'unsupported',
          error: 'Tipo de archivo no soportado. Solo se admiten PDF, Word (.docx) y PowerPoint (.pptx)'
        };
    }
    
    return {
      text,
      type: fileType
    };
  } catch (error) {
    return {
      text: '',
      type: fileType,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar el documento'
    };
  }
}