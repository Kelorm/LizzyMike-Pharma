# PDF Generation Setup Guide

## WeasyPrint Installation

To enable PDF generation for receipts and invoices, install WeasyPrint:

### Windows
```bash
pip install weasyprint
```

### macOS
```bash
pip install weasyprint
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential python3-dev python3-pip python3-setuptools python3-wheel python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
pip install weasyprint
```

## Features

### Receipt Features
- ✅ Professional thermal printer format (80mm width)
- ✅ PRO badge for premium features
- ✅ Barcode generation
- ✅ Customer information
- ✅ Itemized list with quantities and prices
- ✅ Payment method details
- ✅ Transaction ID
- ✅ Auto-print functionality
- ✅ Tear-off customer copy

### Invoice Features
- ✅ Professional A4 format
- ✅ Company branding and logo
- ✅ Detailed customer information
- ✅ Itemized table with descriptions
- ✅ Tax and discount calculations
- ✅ Payment method details
- ✅ Barcode for tracking
- ✅ Prescription notes section
- ✅ Professional styling

## Usage

### Receipt
- URL: `/receipt/{sale_id}/`
- Format: Thermal printer style (80mm)
- Content: Customer copy with barcode

### Invoice
- URL: `/api/sales/{sale_id}/invoice/`
- Format: Professional A4
- Content: Detailed invoice for records

## Fallback

If WeasyPrint is not installed, the system will automatically fall back to HTML generation, which can still be printed using the browser's print function.

## Customization

### Colors
- Primary: #4a86e8 (Blue)
- Secondary: #f8f9fa (Light Gray)
- Success: #28a745 (Green)
- Warning: #ffc107 (Yellow)

### Fonts
- Receipt: Courier New (monospace)
- Invoice: Arial (sans-serif)

### Sizes
- Receipt: 80mm width (thermal printer)
- Invoice: A4 (210mm x 297mm) 