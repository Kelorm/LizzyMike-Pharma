import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Smartphone, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  requiresCard?: boolean;
  requiresPhone?: boolean;
  requiresInsurance?: boolean;
}

interface PaymentProcessorProps {
  total: number;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  onPaymentDetailsChange: (details: any) => void;
  customer?: any;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  total,
  paymentMethod,
  onPaymentMethodChange,
  onPaymentDetailsChange,
  customer,
}) => {
  const [paymentDetails, setPaymentDetails] = useState<any>({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash',
      icon: <Banknote className="h-5 w-5" />,
      description: 'Pay with cash',
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'Pay with card',
      requiresCard: true,
    },
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'Pay with mobile money',
      requiresPhone: true,
    },
    {
      id: 'insurance',
      name: 'Insurance',
      icon: <Shield className="h-5 w-5" />,
      description: 'Pay with insurance',
      requiresInsurance: true,
    },
    {
      id: 'insurance-copay',
      name: 'Insurance Copay',
      icon: <Shield className="h-5 w-5" />,
      description: 'Pay insurance copay',
      requiresInsurance: true,
    },
  ];

  const currentMethod = paymentMethods.find(m => m.id === paymentMethod);

  const handlePaymentDetailsChange = (field: string, value: any) => {
    const newDetails = { ...paymentDetails, [field]: value };
    setPaymentDetails(newDetails);
    onPaymentDetailsChange(newDetails);
  };

  const validatePaymentDetails = (): boolean => {
    if (!currentMethod) return false;

    if (currentMethod.requiresCard) {
      if (!paymentDetails.cardNumber || !paymentDetails.expiry || !paymentDetails.cvv) {
        setError('Please fill in all card details');
        return false;
      }
    }

    if (currentMethod.requiresPhone) {
      if (!paymentDetails.phoneNumber) {
        setError('Please enter phone number for mobile money');
        return false;
      }
    }

    if (currentMethod.requiresInsurance) {
      if (!customer?.insurance) {
        setError('Customer must have insurance for this payment method');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const processPayment = async () => {
    if (!validatePaymentDetails()) return;

    setProcessing(true);
    setError(null);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => onPaymentMethodChange(method.id)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                paymentMethod === method.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-600">{method.icon}</div>
                <div>
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-gray-600">{method.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Details */}
      {currentMethod && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-4">Payment Details</h4>
          
          {currentMethod.requiresCard && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={paymentDetails.cardNumber || ''}
                  onChange={(e) => handlePaymentDetailsChange('cardNumber', formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.expiry || ''}
                    onChange={(e) => handlePaymentDetailsChange('expiry', formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.cvv || ''}
                    onChange={(e) => handlePaymentDetailsChange('cvv', e.target.value.replace(/\D/g, ''))}
                    placeholder="123"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}

          {currentMethod.requiresPhone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={paymentDetails.phoneNumber || ''}
                onChange={(e) => handlePaymentDetailsChange('phoneNumber', e.target.value)}
                placeholder="024-123-4567"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {currentMethod.requiresInsurance && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-blue-800">
                  Insurance: {customer?.insurance || 'No insurance'}
                </span>
              </div>
              {!customer?.insurance && (
                <p className="text-xs text-red-600 mt-1">
                  Customer must have insurance for this payment method
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Summary */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium mb-3">Payment Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span className="font-semibold">GHS {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Payment Method:</span>
            <span>{currentMethod?.name || 'Not selected'}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={16} />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-600" size={16} />
            <span className="text-green-800">Payment processed successfully!</span>
          </div>
        </div>
      )}

      {/* Process Payment Button */}
      <button
        onClick={processPayment}
        disabled={processing || !currentMethod}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          processing || !currentMethod
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {processing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Processing Payment...
          </div>
        ) : (
          `Complete Payment - GHS ${total.toFixed(2)}`
        )}
      </button>
    </div>
  );
};

export default PaymentProcessor; 