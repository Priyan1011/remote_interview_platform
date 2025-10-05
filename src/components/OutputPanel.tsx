import React from 'react';

interface OutputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  output: string;
  isLoading: boolean;
  error?: string;
}

const OutputPanel: React.FC<OutputPanelProps> = ({
  isOpen,
  onClose,
  output,
  isLoading,
  error
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 md:w-3/4 lg:w-1/2 h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Code Output</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {/* Output Content */}
        <div className="flex-1 p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h3 className="text-red-800 font-semibold">Error:</h3>
              <pre className="text-red-600 whitespace-pre-wrap mt-2">{error}</pre>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded p-4 h-full">
              <h3 className="text-gray-800 font-semibold mb-2">Output:</h3>
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {output || "No output generated"}
              </pre>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutputPanel;