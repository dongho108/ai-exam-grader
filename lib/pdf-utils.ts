import * as pdfjs from 'pdfjs-dist';

// Configure the worker for pdfjs
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

/**
 * Converts a PDF file to an array of base64 image strings (one per page)
 */
export async function convertPdfToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const imageUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High quality scale
    
    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to base64 image
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      imageUrls.push(dataUrl);
    }
  }

  return imageUrls;
}
