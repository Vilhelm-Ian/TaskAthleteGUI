// src/components/DatePicker.jsx
import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { ChevronLeft, ChevronRight } from 'lucide-preact';

// Helper to format date to YYYY-MM-DD
const toYYYYMMDD = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DatePicker = ({
  initialSelectedDate,
  onDateSelect,
  onClose,
  fetchHighlightedDatesForMonth,
}) => {
  const [viewDate, setViewDate] = useState(new Date(initialSelectedDate || Date.now()));
  const [localHighlightedDates, setLocalHighlightedDates] = useState(new Set());
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-indexed

  useEffect(() => {
    if (fetchHighlightedDatesForMonth) {
      setIsLoadingHighlights(true);
      fetchHighlightedDatesForMonth(currentYear, currentMonth + 1)
        .then(dates => {
          setLocalHighlightedDates(new Set(dates));
        })
        .catch(err => {
          console.error("DatePicker: Error fetching dates for highlighting", err);
          setLocalHighlightedDates(new Set());
        })
        .finally(() => {
          setIsLoadingHighlights(false);
        });
    }
  }, [currentYear, currentMonth, fetchHighlightedDatesForMonth]);


  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

  const calendarGrid = useMemo(() => {
    const numDays = daysInMonth(currentYear, currentMonth);
    const firstDay = firstDayOfMonth(currentYear, currentMonth);
    const todayYYYYMMDD = toYYYYMMDD(new Date());
    const selectedYYYYMMDD = initialSelectedDate ? toYYYYMMDD(initialSelectedDate) : null;

    const grid = [];
    let dayCounter = 1;
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < firstDay) || dayCounter > numDays) {
          week.push(<td key={`empty-${i}-${j}`} className="p-1 h-10"></td>);
        } else {
          const dateValue = new Date(currentYear, currentMonth, dayCounter);
          const dateStr = toYYYYMMDD(dateValue);
          const isToday = dateStr === todayYYYYMMDD;
          const isSelected = dateStr === selectedYYYYMMDD;
          const hasWorkout = localHighlightedDates.has(dateStr);

          let cellClass = "p-1 h-10 text-sm text-center cursor-pointer rounded-full hover:bg-[var(--color-accent-subtle-bg)] transition-colors relative";
          let textClass = "text-[var(--color-text-default)]";

          if (isSelected) {
            cellClass += " bg-[var(--color-accent-emphasis)]";
            textClass = "text-[var(--color-text-on-accent)] font-semibold";
          } else if (isToday) {
            // Ring for today, using accent color for border
            cellClass += " border-2 border-[var(--color-accent-emphasis)]";
            textClass = "text-[var(--color-accent-emphasis)] font-medium";
          }
          
          let workoutIndicatorDot = null;
          if (hasWorkout) {
            if (!isSelected) {
                 workoutIndicatorDot = <span className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[var(--color-accent-success)] rounded-full"></span>;
            }
          }

          week.push(
            <td key={`day-${dayCounter}`} 
                className={cellClass}
                onClick={() => {
                  onDateSelect(dateValue);
                  if (onClose) onClose();
                }}
            >
              <span className={textClass}>{dayCounter}</span>
              {workoutIndicatorDot}
            </td>
          );
          dayCounter++;
        }
      }
      grid.push(<tr key={`week-${i}`}>{week}</tr>);
      if (dayCounter > numDays) break;
    }
    return grid;
  }, [currentYear, currentMonth, initialSelectedDate, localHighlightedDates, onDateSelect, onClose]);

  const changeMonth = (offset) => {
    const newDate = new Date(viewDate);
    newDate.setDate(1); 
    newDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="absolute z-30 top-full mt-2 left-1/2 transform -translate-x-1/2 bg-[var(--color-bg-surface)] p-4 rounded-lg shadow-xl border border-[var(--color-border-subtle)] w-[20rem] sm:w-[22rem]">
      <div className="flex items-center justify-between mb-3">
        <button 
          onClick={() => changeMonth(-1)} 
          className="p-2 rounded-full hover:bg-[var(--color-bg-surface-alt)] text-[var(--color-text-subtle)]"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="font-semibold text-md text-[var(--color-text-default)]">
          {monthNames[currentMonth]} {currentYear}
          {isLoadingHighlights && <span className="ml-2 text-xs text-[var(--color-text-muted)]">(Loading...)</span>}
        </div>
        <button 
          onClick={() => changeMonth(1)} 
          className="p-2 rounded-full hover:bg-[var(--color-bg-surface-alt)] text-[var(--color-text-subtle)]"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <th key={d} className="pb-2 pt-1 text-xs text-[var(--color-text-muted)] font-medium">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>{calendarGrid}</tbody>
      </table>
      {onClose && (
          <button 
            onClick={onClose}
            className="mt-4 w-full py-2 px-4 bg-[var(--color-bg-surface-alt)] text-[var(--color-text-default)] rounded-md hover:bg-[var(--color-border-subtle)] transition-colors text-sm"
          >
            Close
          </button>
      )}
    </div>
  );
};

export default DatePicker;
