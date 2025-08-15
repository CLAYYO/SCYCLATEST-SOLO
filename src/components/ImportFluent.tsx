import { useState, useRef, useCallback } from 'react';
import { importFluentForms } from '../lib/importForms';

interface ImportFluentProps {
  onClose: () => void;
  onSuccess: (results: any) => void;
}

const ImportFluent = ({ onClose, onSuccess }: ImportFluentProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/json') {
        setFile(droppedFile);
        readFile(droppedFile);
      } else {
        setError('Please upload a JSON file');
      }
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/json') {
        setFile(selectedFile);
        readFile(selectedFile);
      } else {
        setError('Please upload a JSON file');
      }
    }
  }, []);

  const readFile = (file: File) => {
    setError(null);
    setParsedData(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate that this is a Fluent Forms export
        if (Array.isArray(data)) {
          // Check if each item has expected Fluent Forms structure
          const validForms = data.filter(form => 
            form.id && 
            form.title && 
            form.form_fields
          );
          
          if (validForms.length > 0) {
            setParsedData(validForms);
          } else {
            setError('The JSON file does not contain valid Fluent Forms data');
          }
        } else if (data.id && data.title && data.form_fields) {
          // Single form object
          setParsedData([data]);
        } else {
          setError('The JSON file does not contain valid Fluent Forms data');
        }
      } catch (err) {
        console.error('Error parsing JSON:', err);
        setError('Error parsing JSON file. Please ensure it\'s a valid JSON file.');
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  const cancelImport = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const confirmImport = async () => {
    if (!parsedData) {
      setError('No valid data to import');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const results = await importFluentForms(parsedData);
      setSuccess(true);
      onSuccess(results);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Error importing forms');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Import Forms from Fluent Forms</h2>
        
        {success ? (
          <div className="mb-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <p>Forms imported successfully!</p>
            </div>
            <button
              onClick={cancelImport}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {!parsedData ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 text-center cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop a Fluent Forms JSON export file here, or click to select a file
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  JSON file only
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <h3 className="font-bold mb-2">Forms to Import:</h3>
                <div className="bg-gray-100 p-4 rounded mb-4 max-h-60 overflow-y-auto">
                  <ul className="list-disc pl-5">
                    {parsedData.map((form, index) => (
                      <li key={index} className="mb-1">
                        {form.title} (ID: {form.id})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelImport}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                disabled={isUploading}
              >
                Cancel
              </button>
              {parsedData && (
                <button
                  onClick={confirmImport}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                  disabled={isUploading}
                >
                  {isUploading ? 'Importing...' : 'Import Forms'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportFluent;