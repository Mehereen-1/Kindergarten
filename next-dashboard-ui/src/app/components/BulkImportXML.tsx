'use client';

import { useState, useEffect } from 'react';
import { Upload, Download, CheckCircle, XCircle, RefreshCw, Mail, Trash2, Clock } from 'lucide-react';

interface BulkImportXMLProps {
  type: 'teachers' | 'students' | 'parents';
  onImportComplete?: () => void;
}

interface ImportedItem {
  id: string;
  name: string;
  email: string;
  importedAt: string;
  status: 'pending' | 'responded' | 'expired';
}

export default function BulkImportXML({ type, onImportComplete }: BulkImportXMLProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);
  const [showManagement, setShowManagement] = useState(false);
  const [managementLoading, setManagementLoading] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  const templateFiles = {
    teachers: '/templates/teachers_template.xml',
    students: '/templates/students_template.xml',
  };

  const fetchImportedItems = async () => {
    if (type === 'students') return; // No management for students
    
    setManagementLoading(true);
    try {
      const response = await fetch(`/api/admin/${type}/imported`);
      const data = await response.json();
      setImportedItems(data[type] || []);
    } catch (error) {
      console.error('Failed to fetch imported items:', error);
    } finally {
      setManagementLoading(false);
    }
  };

  useEffect(() => {
    if (showManagement) {
      fetchImportedItems();
    }
  }, [showManagement]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResults(null);
      setShowResults(false);
    }
  };

  const parseXML = (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) throw new Error('Invalid XML format');

    const nodes = Array.from(xmlDoc.children[0].children);

    return nodes.map((node) => {
      const obj: any = {};
      Array.from(node.children).forEach((child) => {
        obj[child.tagName.toLowerCase()] = child.textContent?.trim();
      });
      return obj;
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResults(null);

    try {
      const xmlText = await file.text();
      const parsedData = parseXML(xmlText);

      const response = await fetch(`/api/admin/${type}/import-xml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsedData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResults(data.results);
      setShowResults(true);
      onImportComplete?.();
      
      // Refresh management list if visible
      if (showManagement) {
        fetchImportedItems();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = templateFiles[type];
    link.download = `${type}_template.xml`;
    link.click();
  };

  const handleResendPassword = async (userId: string) => {
    setResending(userId);
    try {
      const response = await fetch(`/api/admin/${type}/resend-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Password resent successfully');
        fetchImportedItems();
      } else {
        alert(data.error || 'Failed to resend password');
      }
    } catch (error) {
      alert('Failed to resend password');
    } finally {
      setResending(null);
    }
  };

  const handleDeleteExpired = async () => {
    if (!confirm(`Are you sure you want to delete all expired ${type} who haven't responded?`)) return;

    try {
      const response = await fetch(`/api/admin/${type}/delete-expired`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchImportedItems();
      } else {
        alert(data.error || `Failed to delete expired ${type}`);
      }
    } catch (error) {
      alert(`Failed to delete expired ${type}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'expired':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              📁 Bulk Import {type === 'teachers' ? 'Teachers' : type === 'parents' ? 'Parents' : 'Students'} (XML)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload XML file to import data
            </p>
          </div>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Download size={16} />
            Download Template
          </button>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <input
            type="file"
            accept=".xml"
            onChange={handleFileChange}
            id="xml-upload"
            className="hidden"
          />
          <label htmlFor="xml-upload" className="cursor-pointer">
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {file ? (
                <span className="text-green-600">✓ {file.name}</span>
              ) : (
                'Click to upload XML file'
              )}
            </p>
            <p className="text-xs text-gray-400">Only .xml files supported</p>
          </label>
        </div>

        {file && (
          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-green-500 text-white py-3 rounded-lg font-medium disabled:bg-gray-300 hover:bg-green-600"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        )}

        {/* Results */}
        {showResults && results && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Stat title="Total" value={results.total} />
              <Stat title="Success" value={results.success.length} green />
              <Stat title="Failed" value={results.failed.length} red />
            </div>

            {results.success.length > 0 && (
              <ResultBlock
                title="Successfully Imported"
                color="green"
                icon={<CheckCircle size={20} />}
                items={results.success}
              />
            )}

            {results.failed.length > 0 && (
              <ResultBlock
                title="Failed Imports"
                color="red"
                icon={<XCircle size={20} />}
                items={results.failed}
              />
            )}
          </div>
        )}
      </div>

      {/* Management Section (only for teachers and parents) */}
      {type !== 'students' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Manage Imported {type === 'teachers' ? 'Teachers' : 'Parents'}</h3>
            <button
              onClick={() => setShowManagement(!showManagement)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              <RefreshCw size={16} />
              {showManagement ? 'Hide' : 'Show'}
            </button>
          </div>

          {showManagement && (
            <>
              {managementLoading ? (
                <div className="text-center py-8 text-gray-500">Loading imported {type}...</div>
              ) : importedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No imported {type} yet</div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {importedItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.email}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {getStatusIcon(item.status)}
                            <span>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                          </div>
                        </div>
                        {item.status !== 'responded' && (
                          <button
                            onClick={() => handleResendPassword(item.id)}
                            disabled={resending === item.id}
                            className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:bg-gray-300"
                          >
                            <Mail size={14} />
                            {resending === item.id ? 'Sending...' : 'Resend'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleDeleteExpired}
                    className="w-full mt-4 flex items-center gap-2 justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                    Delete Expired (No Response)
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function Stat({ title, value, green, red }: any) {
  const color = green ? 'green' : red ? 'red' : 'blue';
  return (
    <div className={`bg-${color}-50 p-4 rounded-lg`}>
      <p className="text-sm">{title}</p>
      <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
    </div>
  );
}

function ResultBlock({ title, icon, items, color }: any) {
  return (
    <div className={`bg-${color}-50 p-4 rounded-lg`}>
      <h3 className={`font-semibold text-${color}-800 mb-3 flex items-center gap-2`}>
        {icon} {title}
      </h3>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="bg-white p-3 rounded text-sm">
            {JSON.stringify(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
