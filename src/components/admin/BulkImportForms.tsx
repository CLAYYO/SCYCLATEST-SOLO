import React, { useState } from 'react';
import { X, Upload, CheckCircle, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import type { BulkImportResults } from '../../types/fluentform';

interface BulkImportFormsProps {
  onClose: () => void;
  onSuccess: (results: BulkImportResults) => void;
}

const BulkImportForms: React.FC<BulkImportFormsProps> = ({ onClose, onSuccess }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [results, setResults] = useState<BulkImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBulkImport = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentFile('');
    setError(null);
    setResults(null);

    try {
      // Call the bulk import script via API endpoint
      const response = await fetch('/api/bulk-import-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.type === 'progress') {
                setProgress(data.progress);
                setCurrentFile(data.currentFile || '');
              } else if (data.type === 'complete') {
                setResults(data.results);
                onSuccess(data.results);
              } else if (data.type === 'error') {
                setError(data.error);
              }
            } catch (e) {
              // Ignore JSON parse errors for non-JSON lines
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsRunning(false);
      setProgress(100);
      setCurrentFile('');
    }
  };

  const resetImport = () => {
    setResults(null);
    setError(null);
    setProgress(0);
    setCurrentFile('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Import FluentForms</h2>
            <p className="text-sm text-gray-600 mt-1">
              Import all FluentForm JSON files from the forms directory
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {!results && !error && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">About Bulk Import</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      This will process all FluentForm export JSON files in the forms directory.
                      The import will:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                      <li>Convert FluentForm fields to our database schema</li>
                      <li>Skip forms that already exist (by title)</li>
                      <li>Handle complex nested field structures</li>
                      <li>Provide detailed progress and results</li>
                    </ul>
                  </div>
                </div>
              </div>

              {isRunning && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-900">
                      Processing forms... {progress}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  {currentFile && (
                    <p className="text-sm text-gray-600">
                      Current file: <span className="font-mono">{currentFile}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={isRunning}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={runBulkImport}
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? 'Processing...' : 'Start Bulk Import'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900">Import Failed</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-900">Bulk Import Complete!</h3>
                    <div className="text-sm text-green-700 mt-2 space-y-1">
                      <p>📁 Total files processed: <strong>{results.total}</strong></p>
                      <p>✅ Successfully imported: <strong>{results.successful}</strong></p>
                      <p>⚠️ Skipped (already exist): <strong>{results.skipped}</strong></p>
                      <p>❌ Failed imports: <strong>{results.failed}</strong></p>
                    </div>
                  </div>
                </div>
              </div>

              {results.details && results.details.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Import Details</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {results.details.map((detail, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          detail.success
                            ? 'bg-green-50 border-green-200'
                            : detail.reason === 'already_exists'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {detail.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          ) : detail.reason === 'already_exists' ? (
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{detail.title}</p>
                            {detail.file && (
                              <p className="text-xs text-gray-500 font-mono">{detail.file}</p>
                            )}
                            {detail.fieldsCount && (
                              <p className="text-xs text-gray-600">
                                {detail.fieldsCount} fields imported
                              </p>
                            )}
                            {detail.error && (
                              <p className="text-xs text-red-600 mt-1">{detail.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Import More
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportForms;