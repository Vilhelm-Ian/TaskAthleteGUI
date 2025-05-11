import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { Calendar, Plus, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Award, X as CloseIcon } from 'lucide-preact'; // Added Award, CloseIcon
import DatePicker from '../components/DatePicker';
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
    
    if (!hasMetrics && numSetsToCreate === 1) { // Only return if no metrics AND it's a single set with no explicit count
        // This case could mean an exercise was logged without specific metrics,
        // useful for just tracking occurrence. We might want to show the exercise card
        // with a "No specific metrics logged" message.
        // If numSetsToCreate > 1 and no metrics, it's ambiguous, so we'll treat it as before.
        // For now, let's keep the original logic of returning if !hasMetrics for simplicity.
        // To show exercises even without metrics, this `if (!hasMetrics) return;` line needs adjustment.
        // For now, keeping original behavior.
        if(!hasMetrics) return;
    }

    for (let i = 0; i < numSetsToCreate; i++) {
      const setData = {};
      if (workout.reps != null) setData.reps = workout.reps;
      if (workout.weight != null) setData.weight = workout.weight;
      if (workout.duration_minutes != null) setData.duration = workout.duration_minutes;
      if (workout.distance != null) setData.distance = workout.distance;
      // Add set even if it's empty, to represent a logged set without specific metrics
      // This allows ExerciseCard to show "No quantifiable sets recorded" if needed
      exerciseGroups[exerciseName].sets.push(setData);
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
  
  const [pbNotification, setPbNotification] = useState(null); // For PB toast
  const [userConfigUnits, setUserConfigUnits] = useState('metric'); // 'metric' or 'imperial'

  const dateFormatOptions = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  };

  // Fetch user config for units display
  useEffect(() => {
    const fetchUserConfig = async () => {
      try {
        const config = await invoke('get_config');
        if (config && config.units) {
          // units in backend config is an enum Metric/Imperial as a string
          setUserConfigUnits(config.units.toLowerCase());
        }
      } catch (err) {
        console.error("LogWorkout: Failed to fetch user config:", err);
        // Keep default 'metric'
      }
    };
    fetchUserConfig();
  }, []);

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

  const handleWorkoutAdded = (pbInfo) => { // pbInfo is Option<PBInfo> from Rust
    fetchWorkoutsForCurrentDate();
    if (pbInfo) {
      const anyPbAchieved = pbInfo.weight?.achieved ||
                            pbInfo.reps?.achieved ||
                            pbInfo.duration?.achieved ||
                            pbInfo.distance?.achieved;
      if (anyPbAchieved) {
        setPbNotification(pbInfo);
        // Optional: auto-dismiss after a few seconds
        // setTimeout(() => setPbNotification(null), 7000);
      } else {
        setPbNotification(null);
      }
    } else {
      setPbNotification(null);
    }
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

  const formatPbValue = (value, type) => {
    if (value == null) return 'N/A';
    switch (type) {
      case 'weight':
        return `${value.toFixed(1)} ${userConfigUnits === 'imperial' ? 'lbs' : 'kg'}`;
      case 'reps':
        return `${value} reps`;
      case 'duration':
        return `${value} min`;
      case 'distance': // PBInfo.distance is always in km from backend
        if (userConfigUnits === 'imperial') {
          return `${(value * 0.621371).toFixed(2)} miles`; // Convert km to miles
        }
        return `${value.toFixed(2)} km`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg shadow-themed-lg p-4 sm:p-6 relative">
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
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="p-3 rounded-full bg-accent-emphasis text-on-accent shadow-themed-lg hover:bg-accent-emphasis-hover transition-colors flex items-center justify-center"
              aria-label="Add exercise"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </div>

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
                <ExerciseCard key={`${exercise.name}-${dateKey}-${index}`} exercise={exercise} userConfigUnits={userConfigUnits} />
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

      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        currentDateKey={dateKey}
        onWorkoutAdded={handleWorkoutAdded}
      />

      {/* PB Notification Toast */}
      {pbNotification && (
        <div
          // Basic animation class, define slideInBottom in your CSS
          className="bg-primary fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] bg-accent-positive text-on-accent-positive p-4 rounded-lg shadow-2xl w-full max-w-xs sm:max-w-sm border border-accent-positive-emphasis animate-slide-in-bottom"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <Award size={24} className="mr-3 mt-1 text-current flex-shrink-0" />
            <div className="flex-grow">
              <h3 className="text-lg font-semibold mb-2">New Personal Best!</h3>
              <ul className="space-y-1 text-sm">
                {pbNotification.weight?.achieved && (
                  <li>
                    <strong>Weight:</strong> {formatPbValue(pbNotification.weight.new_value, 'weight')}
                    {pbNotification.weight.previous_value != null && (
                       <span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.weight.previous_value, 'weight')})</span>
                    )}
                  </li>
                )}
                {pbNotification.reps?.achieved && (
                  <li>
                    <strong>Reps:</strong> {formatPbValue(pbNotification.reps.new_value, 'reps')}
                    {pbNotification.reps.previous_value != null && (
                       <span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.reps.previous_value, 'reps')})</span>
                    )}
                  </li>
                )}
                {pbNotification.duration?.achieved && (
                  <li>
                    <strong>Duration:</strong> {formatPbValue(pbNotification.duration.new_value, 'duration')}
                     {pbNotification.duration.previous_value != null && (
                       <span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.duration.previous_value, 'duration')})</span>
                    )}
                  </li>
                )}
                {pbNotification.distance?.achieved && (
                  <li>
                    <strong>Distance:</strong> {formatPbValue(pbNotification.distance.new_value, 'distance')}
                     {pbNotification.distance.previous_value != null && (
                       <span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.distance.previous_value, 'distance')})</span>
                    )}
                  </li>
                )}
              </ul>
            </div>
            <button
              onClick={() => setPbNotification(null)}
              className="ml-2 p-1.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Dismiss PB notification"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ExerciseCard = ({ exercise, userConfigUnits }) => ( // Pass userConfigUnits for correct display
  <div className='mb-2'>
    <div className="bg-app p-4 sm:p-5 rounded-xl shadow-themed-lg border border-subtle flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-default">{exercise.name}</h3>
      </div>

      {exercise.sets && exercise.sets.length > 0 ? (
        <div className="space-y-3">
          {exercise.sets.map((set, idx) => (
            <div key={idx} className="bg-surface-alt p-3 rounded-lg border border-subtle">
              {Object.keys(set).length === 0 ? ( // Check if the set object is empty
                <p className="text-sm text-muted italic">Set logged without specific metrics.</p>
              ) : (
                <div className="flex flex-wrap gap-2 sm:gap-3 items-stretch">
                  {set.reps != null && (
                    <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                      <span className="block text-md sm:text-lg font-semibold text-default">{set.reps}</span>
                      <span className='block text-xs text-accent-emphasis font-medium'>Reps</span>
                    </div>
                  )}
                  {set.weight != null && (
                    <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                      <span className="block text-md sm:text-lg font-semibold text-default">{set.weight}</span>
                      <span className="block text-xs text-subtle">{userConfigUnits === 'imperial' ? 'lbs' : 'kg'}</span>
                    </div>
                  )}
                  {set.duration != null && (
                    <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                      <span className="block text-md sm:text-lg font-semibold text-default">{set.duration}</span>
                      <span className="block text-xs text-subtle">min</span>
                    </div>
                  )}
                  {set.distance != null && (
                    <div className="flex-1 min-w-[70px] sm:min-w-[85px] p-2 text-center bg-app rounded-md shadow-themed-sm border border-subtle">
                      <span className="block text-md sm:text-lg font-semibold text-default">{set.distance}</span>
                      <span className="block text-xs text-subtle">{userConfigUnits === 'imperial' ? 'miles' : 'km'}</span>
                    </div>
                  )}
                </div>
              )}
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
