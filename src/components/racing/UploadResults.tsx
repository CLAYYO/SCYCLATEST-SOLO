import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import type { ParsedRaceData } from '../../utils/sailwaveParser';

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  isImporting: boolean;
  uploadProgress: number;
  parsedData: ParsedRaceData | null;
  error: string | null;
  success: boolean;
  importResult: any | null;
}

const UploadResults: React.FC = () => {
  const [state, setState] = useState<UploadState>({
    isDragging: false,
    isUploading: false,
    isImporting: false,
    uploadProgress: 0,
    parsedData: null,
    error: null,
    success: false,
    importResult: null,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const validateFile = (file: File): string | null => {
    if (!file.name.match(/\.(htm|html)$/i)) {
      return 'Please upload an HTML file (.htm or .html)';
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return 'File size must be less than 5MB';
    }
    return null;
  };

  const processFile = async (file: File) => {
    const validation = validateFile(file);
    if (validation) {
      setState(prev => ({ ...prev, error: validation, isDragging: false }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isUploading: true, 
      error: null, 
      isDragging: false,
      success: false,
      parsedData: null 
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/racing/upload-results', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        parsedData: result.data,
        success: true,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const confirmImport = async () => {
    if (!state.parsedData) return;

    setState(prev => ({ ...prev, isImporting: true, error: null }));

    try {
      const response = await fetch('/api/racing/confirm-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.parsedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setState(prev => ({
        ...prev,
        isImporting: false,
        importResult: result,
        success: true,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isImporting: false,
        error: error instanceof Error ? error.message : 'Import failed',
      }));
    }
  };

  const cancelImport = () => {
    setState(prev => ({ ...prev, parsedData: null, error: null }));
  };

  const resetState = () => {
    setState({
      isDragging: false,
      isUploading: false,
      isImporting: false,
      uploadProgress: 0,
      parsedData: null,
      error: null,
      success: false,
      importResult: null,
    });
  };

  if (state.success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Race Results Imported Successfully!
        </h3>
        <p className="text-gray-600 mb-4">
          The race results have been added to the database and are now visible on the website.
        </p>
        <button
          onClick={resetState}
          className="bg-navy-600 text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors"
        >
          Upload Another File
        </button>
      </div>
    );
  }

  if (state.parsedData) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Preview: {state.parsedData.title}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Date:</span> {state.parsedData.date}
            </div>
            <div>
              <span className="font-medium">Venue:</span> {state.parsedData.venue}
            </div>
            <div>
              <span className="font-medium">Divisions:</span> {state.parsedData.divisions.join(', ')}
            </div>
            <div>
              <span className="font-medium">Competitors:</span> {state.parsedData.competitors.length}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Place
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Division
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sail No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nett
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.parsedData.competitors.slice(0, 10).map((competitor, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {competitor.place}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {competitor.division}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {competitor.sailNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {competitor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {competitor.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {competitor.nett}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.parsedData.competitors.length > 10 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              ... and {state.parsedData.competitors.length - 10} more competitors
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={cancelImport}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmImport}
            disabled={state.isUploading}
            className="bg-navy-600 text-white px-4 py-2 rounded-md hover:bg-navy-700 disabled:opacity-50 transition-colors"
          >
            {state.isUploading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="mt-1 text-sm text-red-700">{state.error}</p>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, error: null }))}
              className="ml-auto"
            >
              <X className="h-5 w-5 text-red-400" />
            </button>
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${
            state.isDragging
              ? 'border-navy-400 bg-navy-50'
              : 'border-gray-300 hover:border-gray-400'
          }
          ${
            state.isUploading ? 'opacity-50 pointer-events-none' : ''
          }
        `}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {state.isUploading ? 'Processing...' : 'Upload Sailwave HTML File'}
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop your .htm or .html file here, or click to browse
        </p>
        <input
          type="file"
          accept=".htm,.html"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={state.isUploading}
        />
        <label
          htmlFor="file-upload"
          className="bg-navy-600 text-white px-4 py-2 rounded-md hover:bg-navy-700 cursor-pointer inline-block transition-colors"
        >
          Choose File
        </label>
        <div className="mt-4 text-sm text-gray-500">
          <FileText className="inline h-4 w-4 mr-1" />
          Supported formats: .htm, .html (max 5MB)
        </div>
      </div>
    </div>
  );
};

export default UploadResults;