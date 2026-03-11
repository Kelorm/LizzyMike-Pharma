import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Printer, Download, Share2, FileText, Building, Phone, Mail, User, Calendar, CreditCard, Shield, Clock } from 'lucide-react';
import { Sale, Customer } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ReceiptGeneratorProps {
  sale: Sale;
  customer?: Customer;
  onClose: () => void;
}

// Updated Advanced Receipt Component - v2.0
const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({ sale, customer, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [autoPrinting, setAutoPrinting] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Generate transaction ID with fallback
  const getTransactionId = useCallback(() => {
    return sale.custom_id || `TXN${sale.id.slice(-8).toUpperCase()}`;
  }, [sale.custom_id, sale.id]);

  const handlePrint = useCallback(() => {
    console.log('handlePrint called - receiptRef.current:', !!receiptRef.current);
    if (receiptRef.current) {
      const transactionId = getTransactionId();
      console.log('Opening print window for transaction:', transactionId);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Sanitize content to prevent XSS
        const sanitizedContent = receiptRef.current.innerHTML
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+="[^"]*"/g, '');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Receipt - ${transactionId}</title>
              <style>
                body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; font-size: 12px; line-height: 1.4; }
                .receipt { max-width: 400px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .company-info { font-size: 11px; color: #666; }
                .section { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
                .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .items { margin-bottom: 15px; }
                .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; }
                .item-details { font-size: 10px; color: #666; margin-left: 10px; }
                .totals { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; margin: 10px 0; text-align: center; font-size: 10px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              ${sanitizedContent}
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    try {
                      window.print();
                      console.log('Print command executed successfully');
                      // Send message to parent window about successful print
                      if (window.opener) {
                        window.opener.postMessage({ type: 'print-success', transactionId: '${transactionId}' }, '*');
                      }
                      setTimeout(() => {
                        window.close();
                      }, 2000); // Increased delay to ensure printing completes
                    } catch (error) {
                      console.error('Print failed:', error);
                      // Send message to parent window about print failure
                      if (window.opener) {
                        window.opener.postMessage({ type: 'print-error', error: error.message }, '*');
                      }
                      alert('Print failed. Please try printing manually.');
                    }
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Add error handling for print window
        printWindow.onerror = () => {
          console.error('Print window error occurred');
          toast.error('Print window error. Please try printing manually.');
        };
        
        // Listen for messages from print window
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'print-success') {
            toast.success('Receipt printed successfully!', {
              duration: 3000,
              icon: '✅',
            });
          } else if (event.data.type === 'print-error') {
            toast.error('Print failed. Please try manually.', {
              duration: 4000,
              icon: '❌',
            });
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Cleanup listener
        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } else {
        console.error('Failed to open print window - popup blocked?');
        toast.error('Print popup blocked. Please allow popups or use manual print.', {
          duration: 5000,
          icon: '🚫',
        });
      }
    } else {
      console.error('Receipt ref not available for printing');
      toast.error('Receipt not ready for printing. Please try again.', {
        duration: 3000,
        icon: '⚠️',
      });
    }
  }, [getTransactionId]);
  
  // Auto-print when component mounts (after sale creation)
  useEffect(() => {
    console.log('ReceiptGenerator mounted, setting up auto-print timer');
    setAutoPrinting(true);
    toast.success('Receipt generated! Auto-printing in 2 seconds...', {
      duration: 3000,
      icon: '🖨️',
    });
    // Print automatically after a short delay to ensure DOM is fully loaded
    const timer = setTimeout(() => {
      console.log('Auto-print timer triggered');
      handlePrint();
      setAutoPrinting(false);
    }, 1500); // Increased delay to ensure DOM is fully rendered
    
    return () => {
      console.log('Cleaning up auto-print timer');
      clearTimeout(timer);
    };
  }, [handlePrint]);

  // Add a second auto-print attempt if the first one fails
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log('Fallback auto-print attempt');
      setAutoPrinting(true);
      toast('Retrying auto-print...', {
        duration: 2000,
        icon: '🔄',
      });
      handlePrint();
      setAutoPrinting(false);
    }, 3000); // Try again after 3 seconds
    
    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [handlePrint]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
    }).format(amount);
  };

  const calculateTax = () => {
    // Assuming 12.5% VAT for Ghana
    // Use precise decimal calculations
    const total = Number(sale.total);
    if (isNaN(total)) return 0;
    return Math.round((total * 0.125) * 100) / 100;
  };

  const calculateSubtotalBeforeTax = () => {
    const total = Number(sale.total);
    if (isNaN(total)) return 0;
    const tax = calculateTax();
    return Math.round((total - tax) * 100) / 100;
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/api/sales/${sale.id}/receipt/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${getTransactionId()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download receipt:', error);
      alert(`Failed to download receipt: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const transactionId = getTransactionId();
    if (navigator.share) {
      navigator.share({
        title: `Receipt - ${transactionId}`,
        text: `Receipt for sale ${transactionId} - ${formatCurrency(sale.total)}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`Receipt ${transactionId}: ${formatCurrency(sale.total)}`);
      alert('Receipt link copied to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">Official Receipt</h2>
                <p className="text-blue-100 text-xs sm:text-sm">Transaction #{getTransactionId()}</p>
                {autoPrinting && (
                  <div className="flex items-center gap-2 mt-1 text-yellow-200 text-xs sm:text-sm">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-yellow-200"></div>
                    Auto-printing receipt...
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close receipt"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)]">
          <div ref={receiptRef} className="p-4 sm:p-8 bg-white">
            {/* Company Header */}
            <div className="text-center mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-blue-600">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                  <Building className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">PharmaSystem</h1>
                  <p className="text-blue-600 font-medium text-sm sm:text-base">Professional Pharmacy Management</p>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                <div className="font-medium">123 Healthcare Street, Medical District, Accra</div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-2">
                  <span className="flex items-center gap-2">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    +233 (0) 123-456-789
                  </span>
                  <span className="flex items-center gap-2">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    info@pharmasystem.com
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">License: FDA/PHM-2024-001 | VAT: GH123456789</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
              {/* Transaction Details */}
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Transaction Details
                </h3>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipt Number:</span>
                    <span className="font-mono font-bold text-blue-600">{getTransactionId()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(sale.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{formatTime(sale.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium capitalize bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {sale.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer & Staff Info */}
              <div className="bg-blue-50 p-4 sm:p-6 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Service Information
                </h3>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{customer?.name || 'Walk-in Customer'}</span>
                  </div>
                  {customer?.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Served by:</span>
                    <span className="font-medium">{user?.username || 'Staff Member'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cashier ID:</span>
                    <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">{user?.id || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Items Purchased
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold">#</th>
                      <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold">Item Description</th>
                      <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold">Qty</th>
                      <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold">Unit Price</th>
                      <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3">{index + 1}</td>
                        <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3">
                          <div className="font-medium">{item.medication_name}</div>
                          {item.medication && (
                            <div className="text-gray-500">Code: {item.medication}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center font-medium">{item.qty}</td>
                        <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                          {formatCurrency(item.price * item.qty)}
                          {item.discount && item.discount > 0 && (
                            <div className="text-green-600">-{formatCurrency(item.discount)}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-6 sm:mb-8">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Subtotal (Before Tax):</span>
                  <span>{formatCurrency(calculateSubtotalBeforeTax())}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>VAT (12.5%):</span>
                  <span>{formatCurrency(calculateTax())}</span>
                </div>
                {sale.discount_total && sale.discount_total > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-green-600">
                    <span>Total Discount:</span>
                    <span>-{formatCurrency(sale.discount_total)}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-3">
                  <div className="flex justify-between text-lg sm:text-xl font-bold">
                    <span>TOTAL AMOUNT:</span>
                    <span className="text-blue-600">{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {sale.notes && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="text-xs sm:text-sm font-medium text-yellow-800 mb-1">Special Notes:</div>
                <div className="text-xs sm:text-sm text-yellow-700">{sale.notes}</div>
              </div>
            )}

            {/* Important Notices */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                <span className="font-semibold text-red-800 text-sm sm:text-base">Important Notice</span>
              </div>
              <ul className="text-xs sm:text-sm text-red-700 space-y-1">
                <li>• All items sold are not returnable</li>
                <li>• Please check expiry dates before use</li>
                <li>• Keep this receipt for warranty claims</li>
                <li>• For prescription items, follow dosage instructions</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 sm:pt-6 border-t border-gray-200">
              <div className="mb-3 sm:mb-4">
                <div className="text-base sm:text-lg font-semibold text-gray-800">Thank you for choosing PharmaSystem!</div>
                <div className="text-xs sm:text-sm text-gray-600">Your health is our priority</div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>For inquiries: support@pharmasystem.com | Emergency: +233 (0) 987-654-321</div>
                <div>Visit us: www.pharmasystem.com | Follow us @PharmaSystemGH</div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Generated on {new Date().toLocaleString('en-GH')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 p-4 sm:p-6 border-t">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 text-xs sm:text-sm">
              <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="font-medium">Printing Instructions:</span>
            </div>
            <p className="text-blue-700 text-xs mt-1">
              The receipt will print automatically. If it doesn't print, click the "Print Receipt" button below or check your browser's popup settings.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
              {autoPrinting ? 'Auto-Printing...' : 'Print Receipt'}
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              {loading ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm sm:text-base"
            >
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Share Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptGenerator;
