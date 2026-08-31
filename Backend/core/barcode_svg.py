"""QR and barcode SVG helpers for receipt PDFs."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

CODE39 = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', 'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw',
    'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn',
    'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
    'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww',
    'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn',
    'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn', 'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw',
    'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
    '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
    '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
}


def _sanitize(text: str) -> str:
    allowed = set(CODE39.keys()) - {'*'}
    cleaned = ''.join(ch if ch in allowed else '-' for ch in str(text or '').upper())
    return cleaned[:28] or 'RECEIPT'


def build_code39_svg(text: str, height: int = 44, module_width: float = 1.1) -> str:
    payload = f'*{_sanitize(text)}*'
    x = 0.0
    bars: list[str] = []
    bar_height = height - 12

    for idx, ch in enumerate(payload):
        pattern = CODE39.get(ch)
        if not pattern:
            continue
        for p, mark in enumerate(pattern):
            w = (3.0 if mark == 'w' else 1.0) * module_width
            if p % 2 == 0:
                bars.append(
                    f'<rect x="{x:.2f}" y="0" width="{w:.2f}" height="{bar_height}" fill="#000"/>'
                )
            x += w
        if idx < len(payload) - 1:
            x += module_width

    label = (
        f'<text x="{x / 2:.2f}" y="{height - 1}" text-anchor="middle" '
        f'font-family="Courier New, monospace" font-size="9" fill="#000">'
        f'{_sanitize(text)}</text>'
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{x:.2f}" height="{height}" '
        f'viewBox="0 0 {x:.2f} {height}">{"".join(bars)}{label}</svg>'
    )


def build_qr_svg(text: str, size_px: int = 112, border: int = 2) -> str:
    """Return an inline SVG QR code sized for thermal receipts."""
    payload = str(text or 'RECEIPT')
    try:
        import qrcode

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=1,
            border=border,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        matrix = qr.get_matrix()
        n = len(matrix)
        if n == 0:
            raise ValueError('Empty QR matrix')
        cell = size_px / n
        rects: list[str] = []
        for y, row in enumerate(matrix):
            for x, dark in enumerate(row):
                if dark:
                    rects.append(
                        f'<rect x="{x * cell:.2f}" y="{y * cell:.2f}" '
                        f'width="{cell:.2f}" height="{cell:.2f}" fill="#000"/>'
                    )
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{size_px}" height="{size_px}" '
            f'viewBox="0 0 {size_px} {size_px}" shape-rendering="crispEdges">'
            f'{"".join(rects)}</svg>'
        )
    except Exception as exc:
        logger.warning("QR generation failed, falling back to Code 39: %s", exc)
        return build_code39_svg(payload)


# Black pharmacy cross — prints reliably on thermal (no color fills).
PHARMACY_CROSS_LOGO_SVG = """
<svg width="52" height="52" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pharmacy logo">
  <circle cx="32" cy="32" r="29" fill="none" stroke="#000" stroke-width="3"/>
  <rect x="26" y="12" width="12" height="40" rx="2" fill="#000"/>
  <rect x="12" y="26" width="40" height="12" rx="2" fill="#000"/>
</svg>
""".strip()
