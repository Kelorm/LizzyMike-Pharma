import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface ReceiptQRProps {
  value: string;
  size?: number;
}

/** Renders a QR code as inline SVG (print-safe). */
const ReceiptQR: React.FC<ReceiptQRProps> = ({ value, size = 112 }) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let cancelled = false;
    const payload = String(value || 'RECEIPT');
    QRCode.toString(payload, {
      type: 'svg',
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((out: string) => {
        if (!cancelled) setSvg(out);
      })
      .catch(() => {
        if (!cancelled) setSvg('');
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!svg) {
    return (
      <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px' }}>
        {value}
      </div>
    );
  }

  return (
    <div
      className="receipt-qr"
      style={{ textAlign: 'center', marginTop: '12px' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default ReceiptQR;
