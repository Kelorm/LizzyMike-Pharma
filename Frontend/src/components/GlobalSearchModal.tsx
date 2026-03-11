import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Pill, Users, FileText, ShoppingCart } from 'lucide-react';
import { useGlobalSearch } from '../contexts/GlobalSearchContext';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    performGlobalSearch,
    clearSearch,
    setSearchQuery
  } = useGlobalSearch();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performGlobalSearch(query);
  };

  const handleResultClick = (result: any) => {
    switch (result.type) {
      case 'medication':
        navigate('/inventory');
        break;
      case 'customer':
        navigate('/customers');
        break;
      case 'prescription':
        navigate('/prescription');
        break;
      case 'sale':
        navigate('/sales');
        break;
    }
    onClose();
    clearSearch();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return <Pill className="w-4 h-4" />;
      case 'customer':
        return <Users className="w-4 h-4" />;
      case 'prescription':
        return <FileText className="w-4 h-4" />;
      case 'sale':
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medication':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      case 'prescription':
        return 'bg-purple-100 text-purple-800';
      case 'sale':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[70vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Global Search</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search medications, customers, prescriptions, sales..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-96">
          {isSearching && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Searching...</p>
            </div>
          )}

          {searchError && (
            <div className="p-4 text-center text-red-500">
              <p>{searchError}</p>
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="divide-y divide-gray-200">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full p-4 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getTypeColor(result.type)}`}>
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {result.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searchQuery && (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Start typing to search across the system</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            Search across medications, customers, prescriptions, and sales
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal; 