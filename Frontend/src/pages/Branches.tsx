import React from 'react';
import BranchesPanel from '../components/BranchesPanel';

const Branches: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Branches</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <BranchesPanel />
      </div>
    </div>
  );
};

export default Branches;
