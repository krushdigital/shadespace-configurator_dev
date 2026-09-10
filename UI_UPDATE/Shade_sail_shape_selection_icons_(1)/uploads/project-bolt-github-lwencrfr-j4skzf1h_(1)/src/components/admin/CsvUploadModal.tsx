import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface CsvUploadModalProps {
  title: string;
  tableName: string;
  expectedHeaders: string;
  onUpload: (csvData: string, mode: 'replace' | 'merge') => Promise<void>;
  onClose: () => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  title,
  tableName,
  expectedHeaders,
  onUpload,
  onClose,
}) => {
  const [csvContent, setCsvContent] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useBodyScrollLock(true);
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const parseCsvLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const parseCsvPreview = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setPreviewHeaders([]);
      setPreviewRows([]);
      return;
    }
    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1, 11).map((line) => parseCsvLine(line));
    setPreviewHeaders(headers);
    setPreviewRows(rows);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      parseCsvPreview(text);
    };
    reader.readAsText(file);
  };

  const handleTextPaste = (text: string) => {
    setCsvContent(text);
    parseCsvPreview(text);
    setError(null);
  };

  const handleUpload = async () => {
    if (!csvContent.trim()) {
      setError('No CSV data provided');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await onUpload(csvContent, mode);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Table: <span className="font-mono">{tableName}</span>
          </p>
        </div>

        <div className="p-6 overflow-y-auto overscroll-contain flex-1 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Expected CSV Format</h3>
            <code className="text-xs text-slate-600 font-mono">{expectedHeaders}</code>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Paste CSV Data</label>
            <textarea
              value={csvContent}
              onChange={(e) => handleTextPaste(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              placeholder="edge_type,perimeter,monotec370,extrablock330,shadetec320&#10;webbing,9.0,598.23,583.26,549.57&#10;..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="text-lime-600 focus:ring-lime-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">Merge / Update</span>
                  <p className="text-xs text-gray-500">Update existing rows, add new ones</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="text-sm font-medium text-red-700">Replace All</span>
                  <p className="text-xs text-gray-500">Delete all existing data and insert fresh</p>
                </div>
              </label>
            </div>
            {mode === 'replace' && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 font-medium">
                  This will delete ALL existing rows and replace them. A snapshot will be saved for undo.
                </p>
              </div>
            )}
          </div>

          {previewHeaders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Preview ({previewRows.length} of {csvContent.trim().split('\n').length - 1} rows)
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {previewHeaders.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 border-b">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-100">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5 font-mono text-gray-700">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <button
            onClick={handleUpload}
            disabled={uploading || !csvContent.trim()}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              mode === 'replace'
                ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                : 'bg-lime-600 text-white hover:bg-lime-700 disabled:opacity-50'
            }`}
          >
            {uploading ? 'Uploading...' : mode === 'replace' ? 'Replace All Data' : 'Merge / Update Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
