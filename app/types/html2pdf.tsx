declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number;
    filename?: string;
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      backgroundColor?: string;
      scrollX?: number;
      scrollY?: number;
    };
    jsPDF?: {
      unit?: string;
      format?: string | string[];
      orientation?: 'portrait' | 'landscape';
      precision?: number;
    };
  }

  interface Html2Pdf {
    from(element: HTMLElement): Html2Pdf;
    set(options: Html2PdfOptions): Html2Pdf;
    save(): Promise<void>;
  }

  const html2pdf: () => Html2Pdf;
  export default html2pdf;
}
