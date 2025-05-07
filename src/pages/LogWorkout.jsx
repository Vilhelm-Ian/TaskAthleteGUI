import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { Calendar, Plus, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from 'lucide-preact';
import DatePicker from '../components/DatePicker'; // Adjust path if your structure is different
import AddExerciseModal from '../components/AddExerciseModal';

// Helper function
const processBackendWorkouts = (backendWorkouts) => {
  if (!backendWorkouts || backendWorkouts.length === 0) return [];
  const exerciseGroups = {};
  backendWorkouts.forEach(workout => {
    const exerciseName = workout.exercise_name;
    if (!exerciseName) {
      console.warn("Workout missing exercise_name:", workout);
      return;
    }
    if (!exerciseGroups[exerciseName]) {
      exerciseGroups[exerciseName] = { name: exerciseName, sets: [] };
    }
    const numSetsToCreate = (workout.sets != null && workout.sets > 0) ? workout.sets : 1;
    const hasMetrics = workout.reps != null || workout.weight != null || workout.duration_minutes != null || workout.distance != null;
    if (!hasMetrics) return; 
    for (let i = 0; i < numSetsToCreate; i++) {
      const setData = {};
      if (workout.reps != null) setData.reps = workout.reps;
      if (workout.weight != null) setData.weight = workout.weight;
      if (workout.duration_minutes != null) setData.duration = workout.duration_minutes;
      if (workout.distance != null) setData.distance = workout.distance;
      if (Object.keys(setData).length > 0) {
        exerciseGroups[exerciseName].sets.push(setData);
      }
    }
  });
  return Object.values(exerciseGroups).filter(group => group.sets && group.sets.length > 0);
};

const LogWorkout = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formattedDate, setFormattedDate] = useState("");
  const [dateKey, setDateKey] = useState(""); 
  const [workoutData, setWorkoutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);

  const dateFormatOptions = { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };

  const fetchWorkoutsForCurrentDate = useCallback(async () => {
    if (!dateKey) return; 
    setLoading(true);
    setError(null);
    setWorkoutData([]);
    try {
      const filters = { date: dateKey };
      const backendRawWorkouts = await invoke('list_workouts', { filters });
      setWorkoutData(processBackendWorkouts(backendRawWorkouts));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : (err.message || "Error fetching workouts.");
      console.error("Fetch workouts error:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    setFormattedDate(currentDate.toLocaleDateString(undefined, dateFormatOptions));
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const newDateKey = `${year}-${month}-${day}`;
    setDateKey(newDateKey);
  }, [currentDate]);

  useEffect(() => {
    fetchWorkoutsForCurrentDate();
  }, [fetchWorkoutsForCurrentDate]);

  const handleWorkoutAdded = () => {
    fetchWorkoutsForCurrentDate(); 
  };

  const fetchWorkoutDatesForCalendarMonth = useCallback(async (year, month_one_indexed) => {
    try {
      const datesArray = await invoke('get_workout_dates_for_month', { 
        query: { year: year, month: month_one_indexed } 
      });
      return datesArray || [];
    } catch (err) {
      console.error("LogWorkout: Failed to fetch workout dates for calendar month:", err);
      return [];
    }
  }, []);

  const handleDateSelectFromPicker = (newDate) => {
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg shadow-themed-lg p-4 sm:p-6">
      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 bg-app p-3 sm:p-4 rounded-xl shadow-themed-md border border-divider relative">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 sm:p-3 rounded-full hover:bg-hover transition-colors text-default"
          aria-label="Previous day"
        >
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-hover p-2 rounded-md date-display-toggle"
          onClick={() => setShowDatePicker(prev => !prev)}
        >
          <Calendar size={20} className="text-accent-emphasis" />
          <span className="text-md sm:text-xl font-semibold text-default">{formattedDate}</span>
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-2 sm:p-3 rounded-full hover:bg-hover transition-colors text-default"
          aria-label="Next day"
        >
          <ChevronRight size={24} strokeWidth={2} />
        </button>
        {showDatePicker && (
          <div className="date-picker-container"> 
            <DatePicker
              initialSelectedDate={currentDate}
              onDateSelect={handleDateSelectFromPicker}
              onClose={() => setShowDatePicker(false)}
              fetchHighlightedDatesForMonth={fetchWorkoutDatesForCalendarMonth}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow mt-4 sm:mt-6">
        <div className="space-y-6 sm:space-y-8 relative">
          {/* Add Exercise Button */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="p-3 rounded-full bg-accent-emphasis text-on-accent shadow-themed-lg hover:bg-accent-emphasis-hover transition-colors flex items-center justify-center"
              aria-label="Add exercise"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Workout Display Area */}
          {loading ? (
            <div className="flex flex-col items-center justify-center text-subtle bg-app p-8 rounded-xl shadow-themed-md border border-divider min-h-[200px]">
              <Loader2 size={48} className="animate-spin text-accent-emphasis mb-4" />
              <p className="text-lg">Loading workouts...</p>
            </div>
          ) : error ? (
            <div className="bg-accent-destructive/10 border border-accent-destructive/20 p-6 rounded-xl shadow-themed-md text-accent-destructive">
              <div className="flex items-center mb-2">
                <AlertTriangle size={24} className="mr-3 text-accent-destructive" />
                <h3 className="text-xl font-semibold">Error</h3>
              </div>
              <p>{error}</p>
            </div>
          ) : workoutData.length > 0 ? (
            <div className="space-y-6 sm:space-y-8">
              {workoutData.map((exercise, index) => (
                <ExerciseCard key={`${exercise.name}-${dateKey}-${index}`} exercise={exercise} />
              ))}
            </div>
          ) : (
            <div className="bg-app p-8 rounded-xl shadow-themed-md border border-divider text-center min-h-[200px] flex flex-col justify-center items-center">
              <Calendar size={48} className="text-muted mb-4" />
              <div className="text-subtle text-lg">No exercises logged for this day.</div>
              <p className="text-muted mt-2 text-sm">
                Tap the <Plus size={14} className="inline align-middle text-muted"/> button to add an exercise or pick another date.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AddExerciseModal */}
      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        currentDateKey={dateKey}
        onWorkoutAdded={handleWorkoutAdded}
      />
    </div>
  );
};

const ExerciseCard = ({ exercise }) => (
  <div className='mb-2'>
    {/* Exercise Card Root */}
    <div className="bg-app p-4 sm:p-5 rounded-xl shadow-themed-lg border border-subtle flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-default">{exercise.name}</h3>
      </div>
    
      {exercise.sets && exercise.sets.length > 0 ? (
        <div className="space-y-3">
          {exercise.sets.map((set, idx) => (
            // Set Item Container - NOW USES bg-surface-alt
            <div key={idx} className="bg-surface-alt p-3 rounded-lg border border-subtle">
              <div className="flex flex-wrap gap-2 sm:gap-3 items-stretch">
                {set.reps != null && (
                  // Metric Box
                  <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                    <span className="block text-md sm:text-lg font-semibold text-default">{set.reps}</span>
                    <span className='block text-xs text-accent-emphasis font-medium'>Reps</span>
                  </div>
                )}
                {set.weight != null && (
                  // Metric Box
                  <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                    <span className="block text-md sm:text-lg font-semibold text-default">{set.weight}</span>
                    <span className="block text-xs text-subtle">lbs</span>
                  </div>
                )}
                {set.duration != null && (
                  // Metric Box
                  <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                    <span className="block text-md sm:text-lg font-semibold text-default">{set.duration}</span>
                    <span className="block text-xs text-subtle">min</span>
                  </div>
                )}
                {set.distance != null && (
                  // Metric Box
                  <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                    <span className="block text-md sm:text-lg font-semibold text-default">{set.distance}</span>
                    <span className="block text-xs text-subtle">km</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No quantifiable sets recorded for this exercise.</p>
      )}
    </div>
  </div>
);

export default LogWorkout;
