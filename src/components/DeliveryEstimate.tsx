import { Truck } from 'lucide-react';

interface DeliveryEstimateProps {
  makeDays?: number;
  shipMin?: number;
  shipMax?: number;
  className?: string;
}

// Business days → calendar days, deliberately conservative.
const toCalendar = (d: number) => Math.ceil(d * 1.4) + 1;

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

export function DeliveryEstimate({
  makeDays = 5,
  shipMin = 3,
  shipMax = 7,
  className = '',
}: DeliveryEstimateProps) {
  const make = toCalendar(makeDays);
  const from = addDays(make + toCalendar(shipMin));
  const to = addDays(make + toCalendar(shipMax));

  return (
    <div className={`rounded-lg border border-[#307C31]/30 bg-[#F3FFE3] px-3 py-2.5 ${className}`}>
      <div className="flex items-start gap-2">
        <Truck className="w-4 h-4 text-[#307C31] mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#01312D] leading-snug">
            Made and delivered approx. {from} – {to}
          </p>
          <p className="text-xs text-[#01312D]/70 mt-0.5 leading-relaxed">
            Up to {makeDays} business days to make, then {shipMin}–{shipMax} business days express
            to your door. Duties and taxes included.
          </p>
        </div>
      </div>
    </div>
  );
}
