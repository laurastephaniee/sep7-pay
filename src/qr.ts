import QRCode from "qrcode";

/** Renders a URI as an SVG QR code string (embed it or write it to a file). */
export function toQrSvg(uri: string): Promise<string> {
  return QRCode.toString(uri, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
}

/** Renders a URI as a QR code made of terminal characters. */
export function toQrTerminal(uri: string): Promise<string> {
  return QRCode.toString(uri, { type: "terminal", small: true });
}
