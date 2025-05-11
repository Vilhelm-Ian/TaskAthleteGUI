import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { SlidersHorizontal, Calendar as CalendarIcon, ChevronRight, List, LayoutList, X, AlertTriangle, Loader2 } from 'lucide-preact'; // Added Loader2

// --- Helper to parse muscle strings "Chest,Triceps" or ["Chest", "Triceps"] into ['chest', 'triceps'] ---
const parseMuscles = (muscleData) => {
  if (!muscleData) return [];

  let musclesArray = [];
  if (typeof muscleData === 'string') {
    musclesArray = muscleData.split(',');
  } else if (Array.isArray(muscleData)) {
    musclesArray = muscleData.filter(m => typeof m === 'string');
  } else {
    console.warn('[parseMuscles] Unexpected data type for muscles:', muscleData);
    return [];
  }

  return musclesArray.map(m => m.trim().toLowerCase()).filter(Boolean);
};


// --- Updated WorkoutCard ---
const WorkoutCard = ({ workout, exerciseDef, onSelectWorkout }) => {
  const durationMinutes = workout.duration ? Math.round(workout.duration / 60) : null;
  const durationSeconds = workout.duration ? workout.duration % 60 : null;

  let durationDisplay = null;
  if (durationMinutes !== null) {
    durationDisplay = `${durationMinutes}m`;
    if (durationSeconds > 0) {
      durationDisplay += ` ${durationSeconds}s`;
    }
  } else if (workout.duration) {
    durationDisplay = `${workout.duration}s`;
  }

  const exerciseType = workout.exercise_type || (exerciseDef ? exerciseDef.type_ : null);

  let metrics = [];
  if (workout.sets != null && workout.reps != null) {
    metrics.push(`${workout.sets} sets × ${workout.reps} reps`);
  }
  if (workout.weight != null) {
    metrics.push(`${workout.weight} kg`); // Assuming kg, adapt if units vary
  }
  if (durationDisplay) {
    metrics.push(durationDisplay);
  }
  if (workout.distance != null) {
    metrics.push(`${workout.distance} km`); // Assuming km, adapt if units vary
  }

  return (
    <div
      class="bg-surface-alt p-4 rounded-lg border border-subtle hover:shadow-themed-md transition-shadow cursor-pointer relative flex flex-col justify-between group hover:bg-hover"
      onClick={() => onSelectWorkout(workout)}
    >
      <div>
        <h3 class="text-md font-semibold text-default truncate mb-1" title={workout.exercise_name}>
          {workout.exercise_name || "Unknown Exercise"}
        </h3>
        {exerciseType && <p class="text-xs text-muted mb-2">{exerciseType}</p>}
        {metrics.length > 0 && (
          <div class="mt-2 text-xs text-subtle space-y-0.5">
            {metrics.map((metric, index) => <p key={index}>{metric}</p>)}
          </div>
        )}
      </div>
      <ChevronRight class="absolute top-1/2 -translate-y-1/2 right-4 text-muted group-hover:text-primary" size={20} strokeWidth={2.5} />
    </div>
  );
};

// --- Simple Calendar Component ---
const MiniCalendar = ({ year, month, onDateClick, activeDates, selectedDate, onMonthChange, isMainView = false }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const numDays = daysInMonth(year, month);
  const startOffset = firstDayOfMonth(year, month);

  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(<div key={`empty-${i}`} class="p-1 aspect-square"></div>);
  }
  for (let day = 1; day <= numDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDateObj = new Date(year, month, day);
    currentDateObj.setHours(0, 0, 0, 0);

    const isToday = currentDateObj.getTime() === today.getTime();
    const isActive = activeDates.has(dateStr);
    const isSelected = selectedDate === dateStr;

    calendarDays.push(
      <button
        key={day}
        onClick={() => onDateClick(dateStr)}
        disabled={!isActive && !isMainView && !isSelected}
        class={`p-1 w-full aspect-square flex items-center justify-center rounded-md text-xs transition-colors duration-150
          ${isSelected ? 'bg-primary text-on-primary font-semibold ring-2 ring-primary-focus' : // Assuming text-on-primary for contrast
            isActive ? 'bg-accent-positive/10 text-accent-positive-emphasis hover:bg-accent-positive/20 font-medium' :
            isToday ? 'bg-hover text-subtle' : 'text-muted'}
          ${(!isActive && !isMainView && !isSelected) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-hover'}
        `}
      >
        {day}
      </button>
    );
  }

  const handlePrevMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    onMonthChange(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    onMonthChange(newYear, newMonth);
  };

  return (
    <div class="bg-app p-3 rounded-lg border border-divider shadow-themed-md">
      <div class="flex justify-between items-center mb-3">
        <button onClick={handlePrevMonth} class="p-1.5 hover:bg-hover rounded-full text-subtle">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h3 class="font-semibold text-sm text-default">{monthNames[month]} {year}</h3>
        <button onClick={handleNextMonth} class="p-1.5 hover:bg-hover rounded-full text-subtle">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-xs text-center text-muted mb-1 font-medium">
        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        {calendarDays}
      </div>
    </div>
  );
};

// --- Main History Component ---
const History = () => {
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [displayedWorkouts, setDisplayedWorkouts] = useState([]);
  const [exerciseDefinitions, setExerciseDefinitions] = useState([]);
  const [allMuscles, setAllMuscles] = useState([]);

  const [selectedExerciseNames, setSelectedExerciseNames] = useState(new Set());
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState(new Set());

  const [currentView, setCurrentView] = useState('list');

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      console.log("[HISTORY] Fetching initial data...");
      setIsLoading(true); setError(null);
      try {
        const [workoutsDataRaw, exercisesData, musclesData] = await Promise.all([
          invoke('list_workouts', { filters: {} }),
          invoke('list_exercises', { typeFilterStr: null, musclesFilter: null }),
          invoke('list_all_muscles')
        ]);

        if (!Array.isArray(workoutsDataRaw)) {
          console.error("[HISTORY] workoutsDataRaw is not an array:", workoutsDataRaw);
          setAllWorkouts([]);
        } else {
          const parsedWorkouts = workoutsDataRaw.map((w, index) => {
            const originalDateValue = w.timestamp;
            let parsedDate = null;
            let isValidDate = false;

            if (originalDateValue && typeof originalDateValue === 'string' && originalDateValue.trim() !== '') {
              parsedDate = new Date(originalDateValue);
              if (!isNaN(parsedDate.getTime())) {
                isValidDate = true;
              } else {
                if (/^\d{4}-\d{2}-\d{2}$/.test(originalDateValue)) {
                  parsedDate = new Date(originalDateValue + "T00:00:00Z");
                  if (!isNaN(parsedDate.getTime())) {
                    isValidDate = true;
                  } else if (index < 5) {
                     console.warn(`[HISTORY] Workout ${index} (id: ${w.id}): Invalid YYYY-MM-DD date: "${originalDateValue}"`);
                  }
                } else if (index < 5) {
                  console.warn(`[HISTORY] Workout ${index} (id: ${w.id}): Invalid date string (not RFC3339 or YYYY-MM-DD): "${originalDateValue}"`);
                }
              }
            } else if (originalDateValue && index < 5) {
              console.warn(`[HISTORY] Workout ${index} (id: ${w.id}): Non-string or empty date value: `, originalDateValue);
            }
            return { ...w, date: isValidDate ? parsedDate : null };
          });

          const validDateWorkouts = parsedWorkouts.filter(w => w.date !== null);
          setAllWorkouts(validDateWorkouts);
        }

        setExerciseDefinitions(Array.isArray(exercisesData) ? exercisesData : []);
        setAllMuscles(Array.isArray(musclesData) ? musclesData.sort() : []);

      } catch (err) {
        console.error("[HISTORY] CRITICAL ERROR fetching data:", err);
        setError(typeof err === 'string' ? err : (err.message || "Failed to load initial data."));
        setAllWorkouts([]);
        setExerciseDefinitions([]);
        setAllMuscles([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredActiveWorkoutDatesInMonth = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    let workoutsToConsider = [...allWorkouts];

    if (selectedMuscleGroups.size > 0) {
      workoutsToConsider = workoutsToConsider.filter(workout => {
        let exerciseDef = exerciseDefinitions.find(def => def.id === workout.exercise_id);
        if (!exerciseDef && workout.exercise_name) {
            exerciseDef = exerciseDefinitions.find(def => def.name && workout.exercise_name && def.name.toLowerCase() === workout.exercise_name.toLowerCase());
        }
        if (!exerciseDef) return false;
        const workoutMusclesFromDef = parseMuscles(exerciseDef.muscles);
        const workoutMusclesOnDef = new Set(workoutMusclesFromDef);
        for (const selectedLowerMuscle of selectedMuscleGroups) {
          if (workoutMusclesOnDef.has(selectedLowerMuscle)) return true;
        }
        return false;
      });
    }
    if (selectedExerciseNames.size > 0) {
      workoutsToConsider = workoutsToConsider.filter(workout => selectedExerciseNames.has(workout.exercise_name));
    }
    const dates = new Set();
    workoutsToConsider.forEach(workout => {
      if (workout.date instanceof Date && !isNaN(workout.date.getTime())) {
        const d = workout.date;
        if (d.getFullYear() === year && d.getMonth() === month) {
          dates.add(d.toISOString().split('T')[0]);
        }
      }
    });
    return dates;
  }, [allWorkouts, selectedMuscleGroups, selectedExerciseNames, calendarDate, exerciseDefinitions]);

  const uniqueExerciseNames = useMemo(() => {
    const names = new Set(exerciseDefinitions.map(ex => ex.name).filter(Boolean));
    return Array.from(names).sort();
  }, [exerciseDefinitions]);

  useEffect(() => {
    let filtered = [...allWorkouts];
    if (selectedCalendarDate) {
      filtered = filtered.filter(workout => {
        if (!workout.date) return false;
        const workoutDateStr = workout.date.toISOString().split('T')[0];
        return workoutDateStr === selectedCalendarDate;
      });
    }
    if (selectedMuscleGroups.size > 0) {
      filtered = filtered.filter((workout) => {
        let exerciseDef = exerciseDefinitions.find(def => def.id === workout.exercise_id);
        if (!exerciseDef && workout.exercise_name) {
            exerciseDef = exerciseDefinitions.find(def => def.name && workout.exercise_name && def.name.toLowerCase() === workout.exercise_name.toLowerCase());
        }
        if (!exerciseDef) return false;
        const workoutMusclesFromDef = parseMuscles(exerciseDef.muscles);
        const workoutMusclesOnDef = new Set(workoutMusclesFromDef);
        for (const selectedLowerMuscle of selectedMuscleGroups) {
          if (workoutMusclesOnDef.has(selectedLowerMuscle)) return true;
        }
        return false;
      });
    }
    if (selectedExerciseNames.size > 0) {
      filtered = filtered.filter(workout => selectedExerciseNames.has(workout.exercise_name));
    }
    filtered.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
    });
    setDisplayedWorkouts(filtered);
  }, [allWorkouts, selectedExerciseNames, selectedMuscleGroups, exerciseDefinitions, selectedCalendarDate]);

  const groupedWorkoutsByDate = useMemo(() => {
    if (!displayedWorkouts || displayedWorkouts.length === 0) return [];
    const result = [];
    let currentGroup = null;
    for (const workout of displayedWorkouts) {
      if (workout.date) {
        const dateStr = workout.date.toISOString().split('T')[0];
        if (!currentGroup || currentGroup.dateIso !== dateStr) {
          currentGroup = { dateIso: dateStr, workoutsOnDate: [] };
          result.push(currentGroup);
        }
        currentGroup.workoutsOnDate.push(workout);
      }
    }
    return result;
  }, [displayedWorkouts]);

  const handleMuscleToggle = (muscleNameFromList) => {
    const lowerMuscleName = muscleNameFromList.toLowerCase();
    setSelectedMuscleGroups(prev => {
      const next = new Set(prev);
      if (next.has(lowerMuscleName)) next.delete(lowerMuscleName); else next.add(lowerMuscleName);
      return next;
    });
    if (currentView === 'list') setSelectedCalendarDate(null);
  };

  const handleExerciseToggle = (exerciseName) => {
    setSelectedExerciseNames(prev => {
      const next = new Set(prev);
      if (next.has(exerciseName)) next.delete(exerciseName); else next.add(exerciseName);
      return next;
    });
    if (currentView === 'list') setSelectedCalendarDate(null);
  };

  const handleCalendarDateClick = (dateStr) => {
    setSelectedCalendarDate(prev => (prev === dateStr ? null : dateStr));
  };

  const handleMonthChangeForCalendar = (year, month) => {
    setCalendarDate(new Date(year, month, 1));
  };

  const clearFilters = () => {
    setSelectedExerciseNames(new Set());
    setSelectedMuscleGroups(new Set());
    setSelectedCalendarDate(null);
  };

  const handleSelectWorkout = (workout) => {
    console.log("Selected workout (placeholder):", workout);
  };

  const FilterControls = ({ inModal = false }) => (
    <div class={`flex flex-col gap-4 ${inModal ? '' : 'bg-app p-4 rounded-xl border border-divider shadow-themed-md'}`}>
      {!inModal && <h2 class="text-lg font-semibold mb-3 text-default">Filters</h2>}
      <div>
        <h3 class="font-semibold mb-2 text-sm text-default">By Muscle</h3>
        <div class="max-h-40 overflow-y-auto space-y-1 text-xs pr-1">
          {allMuscles.map(muscle => (
            <label key={muscle} class="flex items-center space-x-2 p-1.5 hover:bg-hover rounded-md cursor-pointer">
              <input type="checkbox" class="form-checkbox h-3.5 w-3.5 text-primary focus:ring-primary/50 border-subtle rounded-sm"
                checked={selectedMuscleGroups.has(muscle.toLowerCase())} onChange={() => handleMuscleToggle(muscle)} />
              <span class="text-default">{muscle}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 class="font-semibold mb-2 text-sm text-default">By Exercise</h3>
        <div class="max-h-40 overflow-y-auto space-y-1 text-xs pr-1">
          {uniqueExerciseNames.map(exName => (
            <label key={exName} class="flex items-center space-x-2 p-1.5 hover:bg-hover rounded-md cursor-pointer">
              <input type="checkbox" class="form-checkbox h-3.5 w-3.5 text-primary focus:ring-primary/50 border-subtle rounded-sm"
                checked={selectedExerciseNames.has(exName)} onChange={() => handleExerciseToggle(exName)} />
              <span class="text-default">{exName}</span>
            </label>
          ))}
        </div>
      </div>
      {(selectedMuscleGroups.size > 0 || selectedExerciseNames.size > 0 || selectedCalendarDate) && (
        <button onClick={clearFilters} class="mt-2 w-full text-xs bg-hover hover:bg-app-alt text-default py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5">
            <X size={14}/> Clear Filters
        </button>
      )}
    </div>
  );

  if (isLoading) return (
    <div class="p-6 text-center text-subtle flex flex-col items-center justify-center min-h-screen bg-surface">
        <Loader2 size={48} class="animate-spin text-primary mb-4" />
        <p class="text-lg">Loading workout history...</p>
    </div>
  );

  if (error) return (
    <div class="p-6 text-center text-accent-destructive bg-accent-destructive/10 rounded-lg border border-accent-destructive/20 m-4">
        <AlertTriangle class="mx-auto mb-2 text-accent-destructive" size={32} />
        <p class="font-semibold">Error loading data:</p>
        <p class="text-sm">{error}</p>
        <p class="text-xs mt-2 text-muted">Please check the browser console for more technical details.</p>
    </div>
  );

  return (
    <div class="flex flex-col sm:flex-row h-full gap-x-6 p-3 sm:p-4 bg-surface min-h-screen">
       <div class="hidden sm:block sm:w-1/3 lg:w-1/4 xl:w-1/5 flex-shrink-0 space-y-4 self-start sticky top-4">
        <FilterControls />
        <div class="bg-app p-1 rounded-xl border border-divider shadow-themed-md"> {/* Adjusted padding and rounded for consistency */}
          <MiniCalendar year={calendarDate.getFullYear()} month={calendarDate.getMonth()}
            activeDates={filteredActiveWorkoutDatesInMonth}
            selectedDate={selectedCalendarDate}
            onMonthChange={handleMonthChangeForCalendar}
            isMainView={false}
            onDateClick={(dateStr) => {
                handleCalendarDateClick(dateStr);
                setCurrentView('list');
            }}/>
        </div>
       </div>

       {showMobileFilters && (
         <div class="sm:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
            <div class="fixed top-0 right-0 h-full w-4/5 max-w-xs bg-surface p-5 shadow-themed-xl z-50 overflow-y-auto flex flex-col"
                onClick={(e) => e.stopPropagation()}>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-default">Filters & Calendar</h2>
                    <button onClick={() => setShowMobileFilters(false)} class="p-1 text-subtle hover:text-default"><X size={22} /></button>
                </div>
                <FilterControls inModal={true} />
                <div class="mt-5 border-t border-divider pt-4">
                  <h3 class="font-semibold mb-2 text-sm text-default">Calendar</h3>
                  <MiniCalendar year={calendarDate.getFullYear()} month={calendarDate.getMonth()}
                    activeDates={filteredActiveWorkoutDatesInMonth}
                    selectedDate={selectedCalendarDate}
                    onMonthChange={handleMonthChangeForCalendar}
                    isMainView={false} /* Should be false for sidebar/modal calendar */
                    onDateClick={(dateStr) => {
                        handleCalendarDateClick(dateStr);
                        setCurrentView('list');
                        setShowMobileFilters(false);
                    }}/>
                </div>
            </div>
         </div>
       )}

       <div class="flex-grow">
          <div class="flex justify-between items-center mb-4">
            <h1 class="text-xl md:text-2xl font-bold text-default">
                {currentView === 'list' && selectedCalendarDate
                    ? `Workouts on ${new Date(selectedCalendarDate + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`
                    : currentView === 'calendar'
                    ? 'Calendar View'
                    : "Workout History"}
            </h1>
            <div class="flex gap-1.5 items-center">
               <button onClick={() => setCurrentView('list')} title="List View"
                class={`p-2 rounded-full transition-colors ${currentView === 'list' ? 'bg-primary/10 text-primary' : 'text-subtle hover:bg-hover'}`}>
                   <LayoutList size={20} strokeWidth={2.5} />
               </button>
               <button onClick={() => setCurrentView('calendar')} title="Calendar View"
                class={`p-2 rounded-full transition-colors ${currentView === 'calendar' ? 'bg-primary/10 text-primary' : 'text-subtle hover:bg-hover'}`}>
                   <CalendarIcon size={20} strokeWidth={2.5} />
               </button>
               <button class="sm:hidden p-2 rounded-full text-subtle hover:bg-hover"
                  aria-label="Filters" onClick={() => setShowMobileFilters(true)}>
                   <SlidersHorizontal size={20} strokeWidth={2.5} />
               </button>
            </div>
          </div>

          {currentView === 'list' && (
            <>
              {selectedCalendarDate && (
                <button onClick={() => setSelectedCalendarDate(null)} class="mb-3 text-sm text-primary hover:underline font-medium">
                  ← Show all dates
                </button>
              )}
              {displayedWorkouts.length > 0 ? (
                <div class="space-y-6">
                  {groupedWorkoutsByDate.map(({ dateIso, workoutsOnDate }) => (
                    <div key={dateIso} class="bg-app p-4 sm:p-5 rounded-xl border border-divider shadow-themed-md">
                      <h2 class="text-base sm:text-lg font-semibold text-default mb-3 sm:mb-4 border-b border-divider pb-2 sm:pb-3">
                        {new Date(dateIso + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </h2>
                      <div class="space-y-4">
                        {workoutsOnDate.map(workout => {
                          let exerciseDef = exerciseDefinitions.find(def => def.id === workout.exercise_id);
                          if (!exerciseDef && workout.exercise_name) {
                              exerciseDef = exerciseDefinitions.find(def => def.name && workout.exercise_name && def.name.toLowerCase() === workout.exercise_name.toLowerCase());
                          }
                          return <WorkoutCard key={workout.id} workout={workout} exerciseDef={exerciseDef} onSelectWorkout={handleSelectWorkout} />
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div class="text-center py-12 text-subtle bg-app rounded-xl border border-divider shadow-themed-md">
                  <LayoutList size={40} class="mx-auto mb-3 text-muted" />
                  <p class="font-medium">
                    {isLoading ? "Loading..." : allWorkouts.length === 0 ? "No workouts found in your history." : "No workouts match your current filters."}
                  </p>
                  {(selectedMuscleGroups.size > 0 || selectedExerciseNames.size > 0 || selectedCalendarDate) && !isLoading && allWorkouts.length > 0 && (
                    <button onClick={clearFilters} class="mt-4 text-sm bg-primary text-on-primary hover:bg-primary/90 py-1.5 px-3.5 rounded-md font-medium">
                        Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {currentView === 'calendar' && (
            <div class="bg-app p-3 sm:p-4 rounded-xl border border-divider shadow-themed-md">
              <MiniCalendar year={calendarDate.getFullYear()} month={calendarDate.getMonth()}
                activeDates={filteredActiveWorkoutDatesInMonth}
                selectedDate={selectedCalendarDate}
                onMonthChange={handleMonthChangeForCalendar}
                isMainView={true}
                onDateClick={(dateStr) => {
                    handleCalendarDateClick(dateStr);
                    setCurrentView('list');
                }}/>
              <p class="mt-3 text-xs text-center text-muted">
                Select a date to view workouts. Dates with workouts (matching current filters) are highlighted.
              </p>
            </div>
          )}
       </div>
    </div>
  );
};

export default History;
