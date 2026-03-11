//src/pages/Prescription.tsx

import React, { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import {
  AlertCard,
  Button,
  ToggleSwitch,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../components/ui';

interface Prescription {
  id: number;
  patient_name: string;
  medication: number | string;
  medication_name?: string;
  dosage: string;
  status: 'Preparing' | 'Ready' | 'Dispensed';
}

interface PrescriptionsProps {
  prescriptions: Prescription[];
  onOpenModal: (type: string, item?: any) => void;
  updateStatus?: (id: string, status: string) => void;
}

const Prescriptions: React.FC<PrescriptionsProps> = ({
  prescriptions,
  onOpenModal,
  updateStatus,
}) => {
  const [showDispensed, setShowDispensed] = useState(false);

  const filteredPrescriptions = prescriptions.filter(
    p => showDispensed || p.status !== 'Dispensed'
  );

  const pendingPrescriptions = filteredPrescriptions.filter(
    p => p.status !== 'Dispensed'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prescription Management</h2>
        <div className="flex items-center gap-4">
          <ToggleSwitch
            label="Show Dispensed"
            checked={showDispensed}
            onChange={setShowDispensed}
          />
          <Button variant="primary" onClick={() => onOpenModal('addPrescription')}>
            <Plus className="mr-2" /> New Prescription
          </Button>
        </div>
      </div>

      <AlertCard 
        title="Pending Prescriptions" 
        icon={<AlertTriangle className="text-yellow-500" />}
      >
        {pendingPrescriptions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No pending prescriptions.</div>
        ) : (
          pendingPrescriptions.map(prescription => (
            <div key={prescription.id} className="p-3 bg-yellow-50 rounded-lg mb-2">
              <div className="font-medium">{prescription.patient_name}</div>
              <div>
                {prescription.medication_name || prescription.medication} - {prescription.dosage}
              </div>
            </div>
          ))
        )}
      </AlertCard>

      <Table>
        <TableHeader headers={['Patient', 'Medication', 'Dosage', 'Status', 'Actions']} />
        <TableBody>
          {filteredPrescriptions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500">
                No prescriptions found.
              </TableCell>
            </TableRow>
          ) : (
            filteredPrescriptions.map(prescription => (
              <TableRow key={prescription.id}>
                <TableCell>{prescription.patient_name}</TableCell>
                <TableCell>{prescription.medication_name || prescription.medication}</TableCell>
                <TableCell>{prescription.dosage}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    prescription.status === 'Dispensed' ? 'bg-green-100 text-green-800' :
                    prescription.status === 'Ready' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {prescription.status}
                  </span>
                </TableCell>
                <TableCell>
                  {prescription.status === 'Preparing' && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => updateStatus && updateStatus(prescription.id.toString(), 'Ready')}
                    >
                      Mark Ready
                    </Button>
                  )}
                  {prescription.status === 'Ready' && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => updateStatus && updateStatus(prescription.id.toString(), 'Dispensed')}
                    >
                      Mark Dispensed
                    </Button>
                  )}
                  {prescription.status === 'Dispensed' && (
                    <span className="text-green-600 text-xs">Complete</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default Prescriptions;