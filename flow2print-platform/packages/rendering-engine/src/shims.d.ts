declare module "qrcode" {
  interface SvgOptions {
    type?: "svg";
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  const QRCode: {
    toString(value: string, options?: SvgOptions): Promise<string>;
  };

  export default QRCode;
}

declare module "svg-to-pdfkit" {
  import type PDFKit from "pdfkit";

  interface SvgToPdfOptions {
    width?: number;
    height?: number;
    preserveAspectRatio?: string;
  }

  const SVGtoPDF: (
    doc: PDFKit.PDFDocument,
    svg: string,
    x: number,
    y: number,
    options?: SvgToPdfOptions,
  ) => void;

  export default SVGtoPDF;
}
