import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileImage, ArrowLeft } from 'lucide-react';
import { ParsedSketchData, prepareFileForUpload, parseSketch, isAcceptedFile, isFileTooLarge } from '../utils/sketchParser';

interface SketchUploadModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (data: ParsedSketchData) => void;
}

type Stage = 'upload' | 'processing' | 'review';

const CONFIDENCE_COLORS = {
  high: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const CORNER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function SketchUploadModal({ open, onClose, onApply }: SketchUploadModalProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSketchData | null>(null);
  const [showLongWait, setShowLongWait] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setStage('upload');
    setError(null);
    setParsedData(null);
    setShowLongWait(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (longWaitTimerRef.current) clearTimeout(longWaitTimerRef.current);
  }, [previewUrl]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    setError(null);

    if (isFileTooLarge(file)) {
      setError('This file is too large. Please use a file under 20MB.');
      return;
    }

    if (!isAcceptedFile(file)) {
      setError('Please upload a JPG, PNG, or PDF file.');
      return;
    }

    // Create preview URL for the file
    if (file.type !== 'application/pdf') {
      const objUrl = URL.createObjectURL(file);
      setPreviewUrl(objUrl);
    } else {
      setPreviewUrl(null);
    }

    setStage('processing');
    setShowLongWait(false);
    longWaitTimerRef.current = setTimeout(() => setShowLongWait(true), 30000);

    try {
      const { base64, mimeType } = await prepareFileForUpload(file);
      const data = await parseSketch(base64, mimeType);
      setParsedData(data);
      setStage('review');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setStage('upload');
    } finally {
      if (longWaitTimerRef.current) clearTimeout(longWaitTimerRef.current);
      setShowLongWait(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleApply = () => {
    if (parsedData) {
      onApply(parsedData);
      reset();
    }
  };

  // Review data editing helpers
  const updateCorners = (corners: number) => {
    if (parsedData) setParsedData({ ...parsedData, corners });
  };

  const updateUnit = (unit: 'metric' | 'imperial') => {
    if (parsedData) setParsedData({ ...parsedData, unit });
  };

  const updateEdgeValue = (index: number, value: number) => {
    if (!parsedData) return;
    const edges = [...parsedData.edges];
    edges[index] = { ...edges[index], value };
    setParsedData({ ...parsedData, edges });
  };

  const updateDiagonalValue = (index: number, value: number) => {
    if (!parsedData) return;
    const diagonals = [...parsedData.diagonals];
    diagonals[index] = { ...diagonals[index], value };
    setParsedData({ ...parsedData, diagonals });
  };

  const updateHeightValue = (index: number, value: number) => {
    if (!parsedData) return;
    const heights = [...parsedData.heights];
    heights[index] = { ...heights[index], value };
    setParsedData({ ...parsedData, heights });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {stage === 'review' && (
              <button
                onClick={() => { reset(); }}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-[#01312D]">
              {stage === 'upload' && 'Upload Your Sketch'}
              {stage === 'processing' && 'Reading Your Sketch'}
              {stage === 'review' && 'Review Measurements'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {stage === 'upload' && (
            <UploadStage
              error={error}
              fileInputRef={fileInputRef}
              onInputChange={handleInputChange}
              onDrop={handleDrop}
              onBrowseClick={() => fileInputRef.current?.click()}
            />
          )}

          {stage === 'processing' && (
            <ProcessingStage showLongWait={showLongWait} onCancel={handleClose} previewUrl={previewUrl} />
          )}

          {stage === 'review' && parsedData && (
            <ReviewStage
              data={parsedData}
              onUpdateCorners={updateCorners}
              onUpdateUnit={updateUnit}
              onUpdateEdgeValue={updateEdgeValue}
              onUpdateDiagonalValue={updateDiagonalValue}
              onUpdateHeightValue={updateHeightValue}
              onApply={handleApply}
              onCancel={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Upload Stage ---
function UploadStage({
  error,
  fileInputRef,
  onInputChange,
  onDrop,
  onBrowseClick,
}: {
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowseClick: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-relaxed">
        Upload an image or PDF of your sketch with the measurements written on it. We'll read the dimensions and fill them in for you.
      </p>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-[#307C31] bg-[#307C31]/5'
            : 'border-slate-300 hover:border-[#307C31] hover:bg-slate-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e); }}
        onClick={onBrowseClick}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#307C31]/10 flex items-center justify-center">
            <Upload className="w-7 h-7 text-[#307C31]" />
          </div>
          <div>
            <p className="text-base font-medium text-[#01312D]">
              Upload your shade sail sketch
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Drag and drop, or tap to browse your files
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <FileImage className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-400">JPG, PNG, or PDF — max 20MB</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}

// --- Processing Stage ---
function ProcessingStage({ showLongWait, onCancel, previewUrl }: { showLongWait: boolean; onCancel: () => void; previewUrl: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-5">
      {previewUrl && (
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <img
            src={previewUrl}
            alt="Your uploaded sketch"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#307C31] animate-spin" />
          </div>
        </div>
      )}
      {!previewUrl && (
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-[#307C31]/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#307C31] animate-spin" />
          </div>
        </div>
      )}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-[#01312D]">Reading your sketch...</p>
        <p className="text-sm text-slate-500">This usually takes 10-20 seconds</p>
        {showLongWait && (
          <p className="text-sm text-slate-500 animate-fade-in">Still working -- almost there</p>
        )}
      </div>
      <button
        onClick={onCancel}
        className="text-sm text-slate-500 hover:text-slate-700 underline transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// --- Review Stage ---
function ReviewStage({
  data,
  onUpdateCorners,
  onUpdateUnit,
  onUpdateEdgeValue,
  onUpdateDiagonalValue,
  onUpdateHeightValue,
  onApply,
  onCancel,
}: {
  data: ParsedSketchData;
  onUpdateCorners: (corners: number) => void;
  onUpdateUnit: (unit: 'metric' | 'imperial') => void;
  onUpdateEdgeValue: (index: number, value: number) => void;
  onUpdateDiagonalValue: (index: number, value: number) => void;
  onUpdateHeightValue: (index: number, value: number) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Success banner */}
      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <p className="text-sm font-medium text-emerald-800">We found your measurements!</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Confident
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Worth checking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Please verify
        </span>
      </div>

      {/* Shape & Unit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Shape</label>
          <select
            value={data.corners}
            onChange={(e) => onUpdateCorners(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#307C31]/30 focus:border-[#307C31]"
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}-sided sail</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Units</label>
          <select
            value={data.unit}
            onChange={(e) => onUpdateUnit(e.target.value as 'metric' | 'imperial')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#307C31]/30 focus:border-[#307C31]"
          >
            <option value="metric">Metric (metres)</option>
            <option value="imperial">Imperial (feet)</option>
          </select>
        </div>
      </div>

      {/* Edge Measurements */}
      {data.edges.length > 0 && (
        <MeasurementSection
          title="Edge Measurements"
          items={data.edges.map((e, i) => ({
            key: i,
            label: `Side ${e.label.charAt(0)}–${e.label.charAt(1)}`,
            value: e.value,
            confidence: e.confidence,
            onChange: (v: number) => onUpdateEdgeValue(i, v),
          }))}
          unit={data.unit === 'metric' ? 'm' : 'ft'}
        />
      )}

      {/* Diagonal Measurements */}
      {data.diagonals.length > 0 && (
        <MeasurementSection
          title="Diagonal Measurements"
          items={data.diagonals.map((d, i) => ({
            key: i,
            label: `Diagonal ${d.label.charAt(0)}–${d.label.charAt(1)}`,
            value: d.value,
            confidence: d.confidence,
            onChange: (v: number) => onUpdateDiagonalValue(i, v),
          }))}
          unit={data.unit === 'metric' ? 'm' : 'ft'}
        />
      )}

      {/* Heights */}
      {data.heights.length > 0 && (
        <MeasurementSection
          title="Fixing Heights"
          items={data.heights.map((h, i) => ({
            key: i,
            label: `Height at corner ${h.corner}`,
            value: h.value,
            confidence: h.confidence,
            onChange: (v: number) => onUpdateHeightValue(i, v),
          }))}
          unit={data.unit === 'metric' ? 'm' : 'ft'}
        />
      )}

      {/* Notes from AI */}
      {data.notes && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-700">{data.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={onApply}
          className="w-full py-3 px-4 bg-[#307C31] hover:bg-[#256325] text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Apply to My Design
        </button>
        <button
          onClick={onCancel}
          className="w-full py-2.5 px-4 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium rounded-xl transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Measurement Section ---
function MeasurementSection({
  title,
  items,
  unit,
}: {
  title: string;
  items: { key: number; label: string; value: number; confidence: 'high' | 'medium' | 'low'; onChange: (v: number) => void }[];
  unit: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">
        {items.map((item) => {
          const colors = CONFIDENCE_COLORS[item.confidence];
          return (
            <div key={item.key} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{item.label}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.value}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v) && v >= 0) item.onChange(v);
                  }}
                  className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-[#307C31]/30 focus:border-[#307C31]"
                />
                <span className="text-xs text-slate-400 w-6">{unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
