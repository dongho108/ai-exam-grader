/**
 * Converts a PDF file to an array of base64 image strings (one per page)
 */
export async function convertPdfToImages(file: File): Promise<string[]> {
  // SSR 환경에서 DOMMatrix 에러를 방지하기 위해 함수 내부에서 동적 import 사용
  const pdfjs = await import('pdfjs-dist');
  
  // CDN 대신 로컬 워커 사용 (Next.js 빌드 환경에서 안정적)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const imageUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    
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
      imageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
    }
  }

  return imageUrls;
}
