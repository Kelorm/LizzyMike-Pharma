declare module 'qrcode' {
  export type QRCodeErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H' | 'low' | 'medium' | 'quartile' | 'high';

  export interface QRCodeToStringOptions {
    type?: 'svg' | 'utf8' | 'terminal';
    margin?: number;
    width?: number;
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toString(
    text: string,
    options?: QRCodeToStringOptions
  ): Promise<string>;

  const QRCode: {
    toString: typeof toString;
  };

  export default QRCode;
}
