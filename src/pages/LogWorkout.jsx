import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
// Added Edit3 icon
import { Calendar, Plus, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Award, X as CloseIcon, Trash2, PlusSquare, Edit3 } from 'lucide-preact';
import DatePicker from '../components/DatePicker';
import AddExerciseModal from '../components/AddExerciseModal';

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
      exerciseGroups[exerciseName] = {
        name: exerciseName,
        logEntries: [],
      };
    }
    const metrics = {};
    if (workout.reps != null) metrics.reps = workout.reps;
    if (workout.weight != null) metrics.weight = workout.weight;
    if (workout.duration_minutes != null) metrics.duration = workout.duration_minutes;
    if (workout.distance != null) metrics.distance = workout.distance;

    // Handle multiple sets from a single backend workout entry
    // workout.sets comes from the backend (e.g., Option<i64> in Rust, so can be null)
    const numberOfSets = (workout.sets != null && workout.sets > 0) ? Number(workout.sets) : 1;

    for (let i = 0; i < numberOfSets; i++) {
      exerciseGroups[exerciseName].logEntries.push({
        // uiId: Unique ID for UI rendering (React key).
        // All "exploded" sets from the same DB row will have different uiId.
        uiId: `${workout.id}-${i}`,
        // dbId: The original database ID.
        // All "exploded" sets from the same DB row will share this dbId for backend operations.
        dbId: workout.id,
        metrics: { ...metrics }, // Clone metrics (they are the same for each expanded set from this row)
        exerciseName: exerciseName, // Keep exercise name for edit pre-selection
        // Optional: for potential display like "Set 1 of 3"
        // setDisplayNumber: i + 1,
        // totalSetsInParentRecord: numberOfSets,
      });
    }
  });
  return Object.values(exerciseGroups).filter(group => group.logEntries && group.logEntries.length > 0);
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

  const [pbNotification, setPbNotification] = useState(null);
  const [userConfigUnits, setUserConfigUnits] = useState('metric');

  const [allExerciseDefinitionsMap, setAllExerciseDefinitionsMap] = useState(new Map());
  const [preSelectedExerciseForModal, setPreSelectedExerciseForModal] = useState(null);
  const [initialLogDataForModal, setInitialLogDataForModal] = useState(null);
  const [editingWorkoutLogId, setEditingWorkoutLogId] = useState(null); // Stores the dbId for edit mode

  const dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

  useEffect(() => { /* fetchAllDefs - remains same */
    const fetchAllDefs = async () => {
      try {
        const defs = await invoke('list_exercises', { typeFilterStr: null, muscleFilter: null });
        const map = new Map();
        (defs || []).forEach(def => map.set(def.name, def));
        setAllExerciseDefinitionsMap(map);
      } catch (err) { console.error("LogWorkout: Failed to fetch all exercise definitions:", err); }
    };
    fetchAllDefs();
  }, []);
  useEffect(() => { /* fetchUserConfig - remains same */
    const fetchUserConfig = async () => {
      try {
        const config = await invoke('get_config');
        if (config && config.units) setUserConfigUnits(config.units.toLowerCase());
      } catch (err) { console.error("LogWorkout: Failed to fetch user config:", err); }
    };
    fetchUserConfig();
  }, []);
  const changeDate = (days) => { /* ... */
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };
  const fetchWorkoutsForCurrentDate = useCallback(async () => { /* ... */
    if (!dateKey) return;
    setLoading(true); setError(null); setWorkoutData([]);
    try {
      const filters = { date: dateKey };
      const backendRawWorkouts = await invoke('list_workouts', { filters });
      setWorkoutData(processBackendWorkouts(backendRawWorkouts));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : (err.message || "Error fetching workouts.");
      console.error("Fetch workouts error:", err); setError(errorMessage);
    } finally { setLoading(false); }
  }, [dateKey]);
  useEffect(() => { /* dateKey update - remains same */
    setFormattedDate(currentDate.toLocaleDateString(undefined, dateFormatOptions));
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setDateKey(`${year}-${month}-${day}`);
  }, [currentDate]);
  useEffect(() => { /* fetchWorkoutsForCurrentDate call - remains same */
    fetchWorkoutsForCurrentDate();
  }, [fetchWorkoutsForCurrentDate]);

  const handleModalActionCompleted = (pbInfo) => {
    fetchWorkoutsForCurrentDate();
    setEditingWorkoutLogId(null);

    if (pbInfo) {
      const anyPbAchieved = pbInfo.weight?.achieved || pbInfo.reps?.achieved || pbInfo.duration?.achieved || pbInfo.distance?.achieved;
      if (anyPbAchieved) setPbNotification(pbInfo);
      else setPbNotification(null);
    } else {
      setPbNotification(null);
    }
  };

  const fetchWorkoutDatesForCalendarMonth = useCallback(async (year, month_one_indexed) => { /* ... */
    try {
      const datesArray = await invoke('get_workout_dates_for_month', { query: { year: year, month: month_one_indexed } });
      return datesArray || [];
    } catch (err) { console.error("LogWorkout: Failed to fetch workout dates:", err); return []; }
  }, []);
  const handleDateSelectFromPicker = (newDate) => { /* ... */ setCurrentDate(newDate); setShowDatePicker(false); };
  const formatPbValue = (value, type) => { /* ... (remains same) */
    if (value == null) return 'N/A';
    switch (type) {
      case 'weight': return `${value.toFixed(1)} ${userConfigUnits === 'imperial' ? 'lbs' : 'kg'}`;
      case 'reps': return `${value} reps`;
      case 'duration': return `${value} min`;
      case 'distance': return userConfigUnits === 'imperial' ? `${(value * 0.621371).toFixed(2)} miles` : `${value.toFixed(2)} km`;
      default: return value.toString();
    }
  };

  const handleOpenAddExerciseModal = () => {
    setPreSelectedExerciseForModal(null);
    setInitialLogDataForModal(null);
    setEditingWorkoutLogId(null);
    setShowAddExerciseModal(true);
  };

  const handleCloseAddExerciseModal = () => {
    setShowAddExerciseModal(false);
    setPreSelectedExerciseForModal(null);
    setInitialLogDataForModal(null);
    setEditingWorkoutLogId(null);
  };

  const handleOpenAddSetModal = useCallback((exerciseName, metricsToCopy) => {
    const definition = allExerciseDefinitionsMap.get(exerciseName);
    if (definition) {
      setPreSelectedExerciseForModal(definition);
      const modalLogData = {
        reps: metricsToCopy.reps?.toString() || '',
        weight: metricsToCopy.weight?.toString() || '',
        duration: metricsToCopy.duration?.toString() || '',
        distance: metricsToCopy.distance?.toString() || ''
      };
      setInitialLogDataForModal(modalLogData);
      setEditingWorkoutLogId(null);
      setShowAddExerciseModal(true);
    } else {
      console.warn(`Def for "${exerciseName}" not found.`);
      handleOpenAddExerciseModal();
    }
  }, [allExerciseDefinitionsMap]);

  const handleOpenEditSetModal = useCallback((logEntryToEdit) => {
    // logEntryToEdit is an object like: { uiId: "...", dbId: original_db_id, metrics: {...}, exerciseName: "..." }
    const exerciseName = logEntryToEdit.exerciseName;
    const definition = allExerciseDefinitionsMap.get(exerciseName);

    if (definition) {
      setPreSelectedExerciseForModal(definition);
      const modalLogData = {
        reps: logEntryToEdit.metrics.reps?.toString() || '',
        weight: logEntryToEdit.metrics.weight?.toString() || '',
        duration: logEntryToEdit.metrics.duration?.toString() || '',
        distance: logEntryToEdit.metrics.distance?.toString() || ''
      };
      setInitialLogDataForModal(modalLogData);
      setEditingWorkoutLogId(logEntryToEdit.dbId); // Use dbId for editing the backend record
      setShowAddExerciseModal(true);
    } else {
      console.error(`Cannot edit: Exercise definition for "${exerciseName}" not found.`);
    }
  }, [allExerciseDefinitionsMap]);


  const handleDeleteWorkoutLogEntry = async (logEntryDbId) => { // Parameter is dbId
    if (!logEntryDbId) return;
    try {
      setLoading(true);
      // Deleting any "exploded" set deletes the original backend record.
      await invoke('delete_workouts', { ids: [logEntryDbId] });
      fetchWorkoutsForCurrentDate(); // Refresh the list
    } catch (err) { console.error("Failed to delete log entry:", err); setError(typeof err === 'string' ? err : (err.message || "Failed to delete entry.")); }
    finally {
      // setLoading(false); // fetchWorkoutsForCurrentDate will handle its own loading state
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg shadow-themed-lg p-4 sm:p-6 relative">
      {/* Date Navigation Bar (remains same) */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 bg-app p-3 sm:p-4 rounded-xl shadow-themed-md border border-divider relative">
        <button onClick={() => changeDate(-1)} className="p-2 sm:p-3 rounded-full hover:bg-hover transition-colors text-default" aria-label="Previous day"><ChevronLeft size={24} strokeWidth={2} /></button>
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-hover p-2 rounded-md date-display-toggle" onClick={() => setShowDatePicker(prev => !prev)}><Calendar size={20} className="text-accent-emphasis" /><span className="text-md sm:text-xl font-semibold text-default">{formattedDate}</span></div>
        <button onClick={() => changeDate(1)} className="p-2 sm:p-3 rounded-full hover:bg-hover transition-colors text-default" aria-label="Next day"><ChevronRight size={24} strokeWidth={2} /></button>
        {showDatePicker && (<div className="date-picker-container"><DatePicker initialSelectedDate={currentDate} onDateSelect={handleDateSelectFromPicker} onClose={() => setShowDatePicker(false)} fetchHighlightedDatesForMonth={fetchWorkoutDatesForCalendarMonth}/></div>)}
      </div>

      <div className="flex-grow mt-4 sm:mt-6">
        <div className="space-y-6 sm:space-y-8 relative">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleOpenAddExerciseModal} className="p-3 rounded-full bg-accent-emphasis text-on-accent shadow-themed-lg hover:bg-accent-emphasis-hover transition-colors flex items-center justify-center" aria-label="Add exercise"><Plus size={20} strokeWidth={2.5} /></button>
          </div>

          {loading && !workoutData.length ? ( /* Loader UI */ <div className="flex flex-col items-center justify-center text-subtle bg-app p-8 rounded-xl shadow-themed-md border border-divider min-h-[200px]"><Loader2 size={48} className="animate-spin text-accent-emphasis mb-4" /><p className="text-lg">Loading workouts...</p></div>
          ) : error ? ( /* Error UI */ <div className="bg-accent-destructive/10 border border-accent-destructive/20 p-6 rounded-xl shadow-themed-md text-accent-destructive"><div className="flex items-center mb-2"> <AlertTriangle size={24} className="mr-3 text-accent-destructive" /> <h3 className="text-xl font-semibold">Error</h3> </div><p>{error}</p></div>
          ) : workoutData.length > 0 ? (
            <div className="space-y-6 sm:space-y-8">
              {workoutData.map((exerciseGroup) => (
                <ExerciseCard
                  key={exerciseGroup.name}
                  exerciseGroup={exerciseGroup}
                  userConfigUnits={userConfigUnits}
                  onOpenAddSetModal={handleOpenAddSetModal}
                  onOpenEditSetModal={handleOpenEditSetModal}
                  onDeleteWorkoutLogEntry={handleDeleteWorkoutLogEntry}
                />
              ))}
            </div>
          ) : ( /* Empty state UI */ <div className="bg-app p-8 rounded-xl shadow-themed-md border border-divider text-center min-h-[200px] flex flex-col justify-center items-center"><Calendar size={48} className="text-muted mb-4" /><div className="text-subtle text-lg">No exercises logged for this day.</div><p className="text-muted mt-2 text-sm"> Tap the <Plus size={14} className="inline align-middle text-muted"/> button to add an exercise or pick another date. </p></div>
          )}
        </div>
      </div>

      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={handleCloseAddExerciseModal}
        currentDateKey={dateKey}
        onActionCompleted={handleModalActionCompleted}
        preSelectedExercise={preSelectedExerciseForModal}
        initialLogData={initialLogDataForModal}
        editingWorkoutLogId={editingWorkoutLogId} // This is dbId
      />

      {/* PB Notification Toast (remains same) */}
      {pbNotification && ( <div className="bg-primary fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] bg-accent-positive text-on-accent-positive p-4 rounded-lg shadow-2xl w-full max-w-xs sm:max-w-sm border border-accent-positive-emphasis animate-slide-in-bottom" role="alert" aria-live="assertive"><div className="flex items-start"><Award size={24} className="mr-3 mt-1 text-current flex-shrink-0" /><div className="flex-grow"><h3 className="text-lg font-semibold mb-2">New Personal Best!</h3><ul className="space-y-1 text-sm"> {pbNotification.weight?.achieved && (<li><strong>Weight:</strong> {formatPbValue(pbNotification.weight.new_value, 'weight')}{pbNotification.weight.previous_value != null && (<span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.weight.previous_value, 'weight')})</span>)}</li>)} {pbNotification.reps?.achieved && (<li><strong>Reps:</strong> {formatPbValue(pbNotification.reps.new_value, 'reps')}{pbNotification.reps.previous_value != null && (<span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.reps.previous_value, 'reps')})</span>)}</li>)} {pbNotification.duration?.achieved && (<li><strong>Duration:</strong> {formatPbValue(pbNotification.duration.new_value, 'duration')}{pbNotification.duration.previous_value != null && (<span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.duration.previous_value, 'duration')})</span>)}</li>)} {pbNotification.distance?.achieved && (<li><strong>Distance:</strong> {formatPbValue(pbNotification.distance.new_value, 'distance')}{pbNotification.distance.previous_value != null && (<span className="text-xs opacity-80 ml-1">(prev: {formatPbValue(pbNotification.distance.previous_value, 'distance')})</span>)}</li>)} </ul></div><button onClick={() => setPbNotification(null)} className="ml-2 p-1.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0" aria-label="Dismiss PB notification"><CloseIcon size={18} /></button></div></div> )}
    </div>
  );
};

const SetItem = ({ logEntry, index, userConfigUnits, onEdit, onDelete }) => (
  // logEntry is now an object like { uiId, dbId, metrics, exerciseName }
  <div className="bg-surface-alt p-3 rounded-lg border border-subtle flex items-center justify-between gap-x-2">
    <div className="flex flex-wrap gap-2 sm:gap-3 items-stretch flex-grow">
      {Object.keys(logEntry.metrics).length === 0 ? (
        <p className="text-sm text-muted italic flex-grow">Set logged (no specific metrics).</p>
      ) : (
        <>
          {logEntry.metrics.reps != null && (<div className="flex-1 min-w-[60px] sm:min-w-[70px] p-1.5 text-center bg-app rounded-md shadow-themed-sm border border-subtle"><span className="block text-md sm:text-lg font-semibold text-default">{logEntry.metrics.reps}</span><span className='block text-xs text-accent-emphasis font-medium'>Reps</span></div>)}
          {logEntry.metrics.weight != null && (<div className="flex-1 min-w-[60px] sm:min-w-[70px] p-1.5 text-center bg-app rounded-md shadow-themed-sm border border-subtle"><span className="block text-md sm:text-lg font-semibold text-default">{logEntry.metrics.weight}</span><span className="block text-xs text-subtle">{userConfigUnits === 'imperial' ? 'lbs' : 'kg'}</span></div>)}
          {logEntry.metrics.duration != null && (<div className="flex-1 min-w-[60px] sm:min-w-[70px] p-1.5 text-center bg-app rounded-md shadow-themed-sm border border-subtle"><span className="block text-md sm:text-lg font-semibold text-default">{logEntry.metrics.duration}</span><span className="block text-xs text-subtle">min</span></div>)}
          {logEntry.metrics.distance != null && (<div className="flex-1 min-w-[60px] sm:min-w-[70px] p-1.5 text-center bg-app rounded-md shadow-themed-sm border border-subtle"><span className="block text-md sm:text-lg font-semibold text-default">{logEntry.metrics.distance}</span><span className="block text-xs text-subtle">{userConfigUnits === 'imperial' ? 'miles' : 'km'}</span></div>)}
        </>
      )}
    </div>
    <div class="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(logEntry)} // Pass the whole logEntry, onEdit handler will use logEntry.dbId
          title="Edit this set"
          className="p-1.5 text-accent-subtle hover:text-accent-emphasis hover:bg-hover rounded-full transition-colors"
        >
          <Edit3 size={18} />
        </button>
        <button
          onClick={() => onDelete(logEntry.dbId)} // Pass dbId for deletion
          title="Delete this set"
          className="p-1.5 text-accent-destructive hover:text-accent-destructive-hover hover:bg-hover rounded-full transition-colors"
        >
          <Trash2 size={18} />
        </button>
    </div>
  </div>
);

const ExerciseCard = ({ exerciseGroup, userConfigUnits, onOpenAddSetModal, onOpenEditSetModal, onDeleteWorkoutLogEntry }) => {
  const lastLogEntryMetrics = exerciseGroup.logEntries.length > 0
    ? exerciseGroup.logEntries[exerciseGroup.logEntries.length - 1].metrics
    : {};

  return (
    <div className='mb-2'>
      <div className="bg-app p-4 sm:p-5 rounded-xl shadow-themed-lg border border-subtle flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-default">{exerciseGroup.name}</h3>
          <button onClick={() => onOpenAddSetModal(exerciseGroup.name, lastLogEntryMetrics)} title="Add another set for this exercise" className="p-1.5 text-accent-emphasis hover:text-accent-emphasis-hover hover:bg-hover rounded-full transition-colors">
            <PlusSquare size={20} />
          </button>
        </div>
        {exerciseGroup.logEntries && exerciseGroup.logEntries.length > 0 ? (
          <div className="space-y-3">
            {exerciseGroup.logEntries.map((logEntry, idx) => ( // logEntry is { uiId, dbId, ... }
              <SetItem
                key={logEntry.uiId} // Use uiId for React key
                logEntry={logEntry}
                index={idx}
                userConfigUnits={userConfigUnits}
                onEdit={onOpenEditSetModal} // onOpenEditSetModal expects the full logEntry
                onDelete={onDeleteWorkoutLogEntry} // onDeleteWorkoutLogEntry expects the dbId
              />
            ))}
          </div>
        ) : ( <p className="text-sm text-muted">No sets recorded for this exercise today.</p> )}
      </div>
    </div>
  );
};

export default LogWorkout;
