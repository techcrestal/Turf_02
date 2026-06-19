import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminTurfs, Slot } from '../../api/adminTurfs';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // Mon first

function parseHour(t: string): number {
  return parseInt(t.split(':')[0]);
}

function generateTimeSlots(openingTime: string, closingTime: string) {
  const start = parseHour(openingTime || '06:00');
  const end = parseHour(closingTime || '22:00');
  const slots = [];
  for (let h = start; h < end; h++) {
    slots.push({
      start: `${String(h).padStart(2, '0')}:00:00`,
      end: `${String(h + 1).padStart(2, '0')}:00:00`,
      label: `${String(h).padStart(2, '0')}:00 – ${String(h + 1).padStart(2, '0')}:00`,
    });
  }
  return slots;
}

// Grid[day][startTime] = price (0 = disabled)
type Grid = Record<number, Record<string, number>>;

function slotsToGrid(slots: Slot[]): Grid {
  const grid: Grid = {};
  for (const s of slots) {
    if (!grid[s.day_of_week]) grid[s.day_of_week] = {};
    grid[s.day_of_week][s.start_time] = s.price_per_slot;
  }
  return grid;
}

function gridToSlots(grid: Grid, timeSlots: ReturnType<typeof generateTimeSlots>): Omit<Slot, 'id'>[] {
  const result: Omit<Slot, 'id'>[] = [];
  for (const day of DAY_INDICES) {
    for (const ts of timeSlots) {
      const price = grid[day]?.[ts.start] ?? 0;
      if (price > 0) {
        result.push({ day_of_week: day, start_time: ts.start, end_time: ts.end, price_per_slot: price });
      }
    }
  }
  return result;
}

interface Props {
  turfId: string;
  courtId: string;
  courtName: string;
  openingTime: string;
  closingTime: string;
  initialSlots: Slot[];
  onClose: () => void;
}

export default function SlotMatrix({ turfId, courtId, courtName, openingTime, closingTime, initialSlots, onClose }: Props) {
  const timeSlots = generateTimeSlots(openingTime, closingTime);
  const [grid, setGrid] = useState<Grid>(() => slotsToGrid(initialSlots));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGrid(slotsToGrid(initialSlots));
  }, [initialSlots]);

  const mutation = useMutation({
    mutationFn: () => adminTurfs.saveSlots(turfId, courtId, gridToSlots(grid, timeSlots)),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const setPrice = useCallback((day: number, startTime: string, value: string) => {
    const price = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    setGrid(prev => ({
      ...prev,
      [day]: { ...(prev[day] ?? {}), [startTime]: price },
    }));
  }, []);

  const fillColumn = (startTime: string, price: number) => {
    setGrid(prev => {
      const next = { ...prev };
      for (const d of DAY_INDICES) {
        next[d] = { ...(next[d] ?? {}), [startTime]: price };
      }
      return next;
    });
  };

  const fillRow = (day: number, price: number) => {
    setGrid(prev => {
      const row: Record<string, number> = {};
      for (const ts of timeSlots) row[ts.start] = price;
      return { ...prev, [day]: row };
    });
  };

  const copyWeekdayToWeekend = () => {
    setGrid(prev => {
      const next = { ...prev };
      const monPrices = prev[1] ?? {};
      for (const d of [5, 6, 0]) {
        next[d] = { ...monPrices };
      }
      return next;
    });
  };

  const clearAll = () => setGrid({});

  return (
    <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Slot Matrix — {courtName}</h3>
          <p className="text-slate-400 text-xs mt-0.5">Set price per slot (₹). Leave 0 to disable a slot.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyWeekdayToWeekend} className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
            Copy Mon–Thu → Fri–Sun
          </button>
          <button onClick={clearAll} className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
            Clear All
          </button>
          <button onClick={onClose} className="text-xs text-slate-400 px-2 py-1.5 hover:text-slate-700">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 text-slate-500 font-medium w-32 sticky left-0 bg-slate-50 z-10">Time Slot</th>
              {DAY_INDICES.map(d => (
                <th key={d} className="px-2 py-2.5 text-slate-500 font-medium min-w-[72px]">
                  <div>{DAYS[d]}</div>
                  <button
                    onClick={() => {
                      const p = prompt(`Fill all ${DAYS[d]} slots with price (₹):`);
                      if (p !== null && !isNaN(Number(p))) fillRow(d, Number(p));
                    }}
                    className="text-indigo-400 hover:text-indigo-600 font-normal mt-0.5"
                    title="Fill entire day"
                  >
                    fill
                  </button>
                </th>
              ))}
              <th className="px-3 py-2.5 text-slate-400 font-normal min-w-[60px]">fill all</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(ts => (
              <tr key={ts.start} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-1.5 text-slate-500 sticky left-0 bg-white whitespace-nowrap">{ts.label}</td>
                {DAY_INDICES.map(d => {
                  const price = grid[d]?.[ts.start] ?? 0;
                  const isWeekend = d === 0 || d === 5 || d === 6;
                  return (
                    <td key={d} className={`px-2 py-1.5 ${isWeekend ? 'bg-amber-50/40' : ''}`}>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={price === 0 ? '' : price}
                        onChange={e => setPrice(d, ts.start, e.target.value)}
                        placeholder="—"
                        className={`w-16 text-center border rounded px-1.5 py-1 text-xs focus:outline-none focus:border-indigo-400 ${
                          price > 0 ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-100 bg-slate-50 text-slate-300 placeholder-slate-300'
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-1.5">
                  <button
                    onClick={() => {
                      const p = prompt(`Fill all days for ${ts.label} with price (₹):`);
                      if (p !== null && !isNaN(Number(p))) fillColumn(ts.start, Number(p));
                    }}
                    className="text-indigo-400 hover:text-indigo-600 text-xs"
                  >
                    fill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save Slots'}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
        {mutation.isError && <span className="text-red-500 text-sm">Save failed</span>}
        <span className="text-slate-400 text-xs ml-auto">
          Weekend columns (Fri–Sun) highlighted in amber
        </span>
      </div>
    </div>
  );
}
