import React, { useState, useEffect } from 'react';
import { Shield, X, CheckCircle2, ArrowRight } from 'lucide-react';

interface FitGuaranteeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FitGuaranteeModal({ isOpen, onClose }: FitGuaranteeModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ${visible ? 'scale-100' : 'scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
        >
          <X className="w-4 h-4 text-brand-green" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#eef2ee]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <h2 className="text-[20px] font-extrabold text-brand-green tracking-tight leading-tight">Fit Guarantee</h2>
              <p className="text-[13px] text-text-muted mt-0.5">Our promise to you on custom sails</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Hero promise */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-[15px] text-emerald-900 leading-relaxed font-medium">
              If your custom-shape sail doesn't fit the space you measured, we'll make you a new one <strong>free of charge</strong> — and you keep the original.
            </p>
          </div>

          {/* When it applies */}
          <section>
            <h3 className="text-[15px] font-bold text-brand-green mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Custom-shape orders
            </h3>
            <p className="text-[14px] text-text-muted leading-relaxed">
              When you order a custom-shape shade sail, you give us the distances between your fixing points and we calculate the finished sail size. Because we make that calculation, we stand behind the result. If the sail doesn't fit your measured space, we replace it free of charge.
            </p>
          </section>

          {/* When it does not apply */}
          <section>
            <h3 className="text-[15px] font-bold text-brand-green mb-2 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-amber-500" />
              Fixed-shape orders
            </h3>
            <p className="text-[14px] text-text-muted leading-relaxed">
              Fixed-shape sails (square, rectangle, triangle) are manufactured to the exact dimensions you specify. Because you choose the finished size, these orders are covered by our standard 30-day returns policy rather than the Fit Guarantee.
            </p>
          </section>

          {/* How to claim */}
          <section>
            <h3 className="text-[15px] font-bold text-brand-green mb-2">How to claim</h3>
            <p className="text-[14px] text-text-muted leading-relaxed">
              Contact us within <strong className="text-brand-green">30 days of delivery</strong> with photographs showing the sail in position and the measurements of your fixing points. We'll arrange the replacement.
            </p>
          </section>

          {/* Fine print */}
          <div className="bg-surface-soft rounded-xl p-3 text-[12px] text-text-muted leading-relaxed">
            <p>The Fit Guarantee applies once per order and only where fixing points are in the positions measured at the time of ordering. It does not apply if the site or structure has been altered after ordering.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-brand-green text-white font-bold text-[15px] hover:bg-brand-dark transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline clickable "Fit Guarantee" badge — opens the modal on tap. */
export function FitGuaranteeBadge({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1 text-brand-mid hover:text-brand-green font-bold underline decoration-dotted underline-offset-2 transition-colors cursor-pointer ${className}`}
      >
        <Shield className="w-3.5 h-3.5" />
        Fit Guarantee
      </button>
      <FitGuaranteeModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
