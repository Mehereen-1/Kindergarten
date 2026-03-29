'use client';

import { useState } from 'react';
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface BulkImportProps {
  type: 'teachers' | 'students';
  onImportComplete?: () => void;
}

export default function BulkImport({ type, onImportComplete }: BulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const templateFiles = {
    teachers: '/templates/teachers_template.csv',
    students: '/templates/students_template.csv'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
      setShowResults(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResults(null);

    try {
      // Read file content
      const text = await file.text();

      // Send to API
      const response = await fetch(`/api/admin/${type}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData: text }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setShowResults(true);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        alert('Import failed: ' + data.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = templateFiles[type];
    link.download = `${type}_template.csv`;
    link.click();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            📁 Bulk Import {type === 'teachers' ? 'Teachers' : 'Students'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload CSV file to create multiple accounts automatically
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          <Download size={16} />
          Download Template
        </button>
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            {file ? (
              <span className="text-green-600 font-medium">✓ {file.name}</span>
            ) : (
              'Click to select CSV file or drag and drop'
            )}
          </p>
          <p className="text-xs text-gray-400">Only .csv files are supported</p>
        </label>
      </div>

      {/* Import Button */}
      {file && (
        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : `Import ${type === 'teachers' ? 'Teachers' : 'Students'}`}
        </button>
      )}

      {/* Results */}
      {showResults && results && (
        <div className="mt-6 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Rows</p>
              <p className="text-2xl font-bold text-blue-600">{results.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Success</p>
              <p className="text-2xl font-bold text-green-600">{results.success.length}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{results.failed.length}</p>
            </div>
          </div>

          {/* Success List */}
          {results.success.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle size={20} />
                Successfully Created ({results.success.length})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {results.success.map((item: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded text-sm border border-green-200">
                    {type === 'teachers' ? (
                      <>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-gray-600">📧 {item.email}</p>
                        <p className="text-gray-600">🔑 Password: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{item.password}</span></p>
                        <p className="text-gray-600">📱 {item.phone}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-800">👨‍🎓 {item.student.name}</p>
                        <p className="text-gray-600">📧 {item.student.email}</p>
                        <p className="text-gray-600">🔑 Password: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{item.student.password}</span></p>
                        <p className="text-gray-600">🏫 {item.student.class} - Section {item.student.section} - Roll #{item.student.rollNumber}</p>
                        <p className="text-gray-500 text-xs mt-1">👨‍👩‍👧 Parent: {item.parent.name} ({item.parent.email})</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed List */}
          {results.failed.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <XCircle size={20} />
                Failed Imports ({results.failed.length})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {results.failed.map((item: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded text-sm border border-red-200">
                    <p className="font-medium text-red-800">Row {item.row}</p>
                    <p className="text-red-600">❌ {item.error}</p>
                    <p className="text-gray-500 text-xs mt-1">Data: {JSON.stringify(item.data)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Credentials Button */}
          {results.success.length > 0 && (
            <button
              onClick={() => {
                const credentials = results.success.map((item: any) => {
                  if (type === 'teachers') {
                    return `${item.name},${item.email},${item.password},${item.phone}`;
                  } else {
                    return `${item.student.name},${item.student.email},${item.student.password},${item.parent.name},${item.parent.email}`;
                  }
                }).join('\n');

                const header = type === 'teachers' 
                  ? 'Name,Email,Password,Phone\n'
                  : 'Student Name,Student Email,Student Password,Parent Name,Parent Email\n';

                const blob = new Blob([header + credentials], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}_credentials_${Date.now()}.csv`;
                a.click();
              }}
              className="w-full bg-purple-500 text-white py-3 rounded-lg font-medium hover:bg-purple-600 transition flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download Credentials (Login Details)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
