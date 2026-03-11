import React, { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { Medication } from '../types';

interface MedicationComboBoxProps {
  medications: Medication[];
  value: string | null; // Changed to string
  onChange: (id: string) => void; // Changed to string
  disabled?: boolean;
  showStock?: boolean;
  className?: string;
}

const MedicationComboBox: React.FC<MedicationComboBoxProps> = ({
  medications,
  value,
  onChange,
  disabled = false,
  showStock = true,
  className = ''
}) => {
  const [query, setQuery] = useState('');

  // Direct string comparison for selected medication
  const selectedMedication = medications.find(m => m.id === value);

  const filteredMedications = query === ''
    ? medications
    : medications.filter(med => 
        med.name.toLowerCase().includes(query.toLowerCase()) || 
        med.category.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <div className={`relative ${className}`}>
      <Combobox 
        value={value} 
        onChange={(id) => { if (id !== null) onChange(id); }} // Ensure id is not null
        disabled={disabled}
      >
        {({ open }) => (
          <>
            <div className="relative">
              <Combobox.Input
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                displayValue={() => selectedMedication?.name || ''}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medication..."
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" />
                </svg>
              </Combobox.Button>
            </div>

            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredMedications.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  No medications found
                </div>
              ) : (
                filteredMedications.map((med) => (
                  <Combobox.Option
                    key={med.id}
                    value={med.id} // Use string id
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-3 pr-9 ${
                        active ? 'bg-blue-600 text-white' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex items-center">
                          <span
                            className={`ml-3 truncate ${
                              selected ? 'font-semibold' : ''
                            }`}
                          >
                            {med.name}
                          </span>
                          {showStock && (
                            <span className="ml-auto mr-4 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              Stock: {med.stock}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                              active ? 'text-white' : 'text-blue-600'
                            }`}
                          >
                            ✓
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </>
        )}
      </Combobox>
    </div>
  );
};

export default MedicationComboBox;