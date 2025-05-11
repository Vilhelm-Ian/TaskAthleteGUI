import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { X, Loader2, AlertTriangle, Search, XCircle, ChevronLeft as BackIcon, PlusCircle, CheckSquare, Square } from 'lucide-preact';
import CreateExerciseModal from './CreateExerciseModal';

const EXERCISE_TYPES = {
  BODYWEIGHT: 'BodyWeight',
  RESISTANCE: 'Resistance',
  CARDIO: 'Cardio',
};
const EXERCISE_TYPE_LABELS = {
  [EXERCISE_TYPES.BODYWEIGHT]: 'Bodyweight',
  [EXERCISE_TYPES.RESISTANCE]: 'Resistance',
  [EXERCISE_TYPES.CARDIO]: 'Cardio',
};


const AddExerciseModal = ({ isOpen, onClose, currentDateKey, onWorkoutAdded }) => {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [searchTerm, setSearchTerm] = useState('');
  const [exercisesToDisplay, setExercisesToDisplay] = useState([]);
  const [availableMuscles, setAvailableMuscles] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [selectedExerciseType, setSelectedExerciseType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialExerciseCount, setInitialExerciseCount] = useState(0);

  // Step 2 state
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [logData, setLogData] = useState({ reps: '', weight: '', duration: '', distance: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userBodyweight, setUserBodyweight] = useState(null);
  const [userBodyweightUnit, setUserBodyweightUnit] = useState('kg');

  const [isCreateExerciseModalOpen, setIsCreateExerciseModalOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [musclesData, configData, allExercisesInitial] = await Promise.all([
        invoke('list_all_muscles'),
        invoke('get_config'),
        invoke('list_exercises', { typeFilterStr: null, muscleFilter: null })
      ]);
      setAvailableMuscles(musclesData || []);
      setInitialExerciseCount(allExercisesInitial ? allExercisesInitial.length : 0);

      if (configData) {
        if (configData.bodyweight != null) {
          setUserBodyweight(parseFloat(configData.bodyweight));
        }
        if (configData.units && configData.units.weight) { // Assuming units is a string like "metric" or "imperial"
            setUserBodyweightUnit(configData.units.toLowerCase() === 'imperial' ? 'lbs' : 'kg');
        } else if (configData.units && typeof configData.units === 'object' && configData.units.weight) { // older config format
            setUserBodyweightUnit(configData.units.weight);
        }
      }
    } catch (err) {
      console.error("Modal initial data fetch error:", err);
      setError(typeof err === 'string' ? err : (err.message || "Failed to load initial data."));
      setAvailableMuscles([]);
      setInitialExerciseCount(0);
    }
    // setLoading(false) will be handled by fetchExercises
  }, []);

  const fetchExercises = useCallback(async (type, muscles, currentSearchTerm) => {
    setLoading(true);
    setError(null);
    try {
      let fetched = await invoke('list_exercises', {
        typeFilterStr: type,
        musclesFilter: muscles.length > 0 ? muscles : null,
      });
      
      if (currentSearchTerm) {
        const lowerSearchTerm = currentSearchTerm.toLowerCase().trim();
        if (lowerSearchTerm) {
            fetched = (fetched || []).filter(ex => ex.name.toLowerCase().includes(lowerSearchTerm));
        }
      }
      setExercisesToDisplay(fetched || []);

    } catch (err) {
      console.error("Modal fetch exercises error:", err);
      setError(typeof err === 'string' ? err : (err.message || "Failed to load exercises."));
      setExercisesToDisplay([]);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSearchTerm('');
      setSelectedMuscles([]);
      setSelectedExerciseType(null);
      setSelectedExercise(null);
      setLogData({ reps: '', weight: '', duration: '', distance: '' });
      setExercisesToDisplay([]);
      setUserBodyweight(null);
      fetchInitialData();
    }
  }, [isOpen, fetchInitialData]);


  useEffect(() => {
    if (isOpen && step === 1) {
      const timeoutId = setTimeout(() => {
        fetchExercises(selectedExerciseType, selectedMuscles, searchTerm);
      }, searchTerm ? 300 : 0);
      
      return () => clearTimeout(timeoutId);
    } else if (!isOpen) {
      setExercisesToDisplay([]);
    }
  }, [isOpen, step, selectedExerciseType, selectedMuscles, searchTerm, fetchExercises]);


  const handleMuscleClick = (muscle) => {
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const handleExerciseTypeClick = (type) => {
    setSelectedExerciseType(prev => (prev === type ? null : type));
  };

  const handleExerciseSelect = async (exercise) => {
    setSelectedExercise(exercise);
    const initialLogData = { reps: '', weight: '', duration: '', distance: '' };
    setLogData(initialLogData);
    setStep(2);
    setError(null);

    if (exercise && exercise.name) {
      try {
        const previousWorkoutsOnLastDay = await invoke('get_previous_workout_details', {
          payload: { identifier: exercise.name, n: 1 }
        });
        if (previousWorkoutsOnLastDay && previousWorkoutsOnLastDay.length > 0) {
          const prevWorkout = previousWorkoutsOnLastDay[0];
          const newLogData = { ...initialLogData };
          if (exercise.log_reps && prevWorkout.reps != null) newLogData.reps = prevWorkout.reps.toString();
          if (exercise.log_weight && prevWorkout.weight != null) newLogData.weight = prevWorkout.weight.toString();
          if (exercise.log_duration && prevWorkout.duration_minutes != null) newLogData.duration = prevWorkout.duration_minutes.toString(); // Note: backend field is duration_minutes
          if (exercise.log_distance && prevWorkout.distance != null) newLogData.distance = prevWorkout.distance.toString();
          setLogData(newLogData);
        }
      } catch (err) {
        console.warn(`Could not fetch previous workout data for '${exercise.name}':`, err);
      }
    }
  };

  const handleLogDataChange = (e) => {
    const { name, value } = e.target;
    if (['reps', 'weight', 'duration', 'distance'].includes(name)) {
        if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
            setLogData(prev => ({ ...prev, [name]: value }));
        }
    } else {
        setLogData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitWorkout = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !currentDateKey) return;

    let hasMetrics = false;
    if (selectedExercise.log_reps && logData.reps) hasMetrics = true;
    if (selectedExercise.log_weight && logData.weight) hasMetrics = true;
    if (selectedExercise.log_duration && logData.duration) hasMetrics = true;
    if (selectedExercise.log_distance && logData.distance) hasMetrics = true;

    if (!hasMetrics) {
        let requiredFieldsMsg = "Please enter at least one value for the fields enabled: ";
        if(selectedExercise.log_reps) requiredFieldsMsg += "Reps, ";
        if(selectedExercise.log_weight) requiredFieldsMsg += "Weight, ";
        if(selectedExercise.log_duration) requiredFieldsMsg += "Duration, ";
        if(selectedExercise.log_distance) requiredFieldsMsg += "Distance, ";
        setError(requiredFieldsMsg.trim().replace(/,$/, '') + ".");
        return;
    }

    setIsSubmitting(true);
    setError(null);
    const workoutDate = new Date(currentDateKey + "T12:00:00.000Z").toISOString();
    const workoutPayload = {
      exercise_identifier: selectedExercise.name,
      date: workoutDate,
      sets: 1,
      reps: selectedExercise.log_reps && logData.reps ? parseInt(logData.reps) : undefined,
      weight: selectedExercise.log_weight && logData.weight ? parseFloat(logData.weight) : undefined,
      duration: selectedExercise.log_duration && logData.duration ? parseInt(logData.duration) : undefined,
      distance: selectedExercise.log_distance && logData.distance ? parseFloat(logData.distance) : undefined,
      bodyweight_to_use: undefined, // Initialize
    };

    if (selectedExercise.type_ === EXERCISE_TYPES.BODYWEIGHT) {
      if (userBodyweight != null && !isNaN(userBodyweight)) {
        workoutPayload.bodyweight_to_use = userBodyweight;
      } else {
        setError("This is a bodyweight exercise, but your bodyweight is not configured. Please set it in settings/profile.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // The backend command 'add_workout' returns: Result<(i64, Option<PBInfo>), String>
      // In JS, this translates to: [workoutId, pbInfoObjectOrNull]
      const [workoutId, pbInfo] = await invoke('add_workout', { params: workoutPayload });
      onWorkoutAdded(pbInfo); // Pass the pbInfo (or null) to the parent component
      onClose();
    } catch (err) {
      console.error("Submit workout error:", err);
      const errorMessage = typeof err === 'string' ? err : (err.message || "Failed to save workout.");
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateExerciseModal = () => setIsCreateExerciseModalOpen(true);

  const handleExerciseCreated = async (newExerciseName) => {
    setIsCreateExerciseModalOpen(false);
    await fetchInitialData();
    if (newExerciseName) {
        setSearchTerm(newExerciseName);
        setSelectedMuscles([]);
        setSelectedExerciseType(null);
    } else {
        fetchExercises(selectedExerciseType, selectedMuscles, searchTerm);
    }
  };

  if (!isOpen) return null;

  const noFiltersActive = !searchTerm.trim() && selectedMuscles.length === 0 && !selectedExerciseType;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
        <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-subtle">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-subtle bg-app">
            <h2 className="text-xl sm:text-2xl font-semibold text-default">
              {step === 1 ? 'Select Exercise' : (
                <span className="flex items-center">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); fetchExercises(selectedExerciseType, selectedMuscles, searchTerm);}}
                    className="mr-3 p-1.5 rounded-full text-subtle hover:bg-surface-alt hover:text-default transition-colors"
                    aria-label="Back to exercise selection"
                  >
                    <BackIcon size={20} />
                  </button>
                  Log: {selectedExercise?.name || 'Details'}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-muted hover:bg-surface-alt hover:text-subtle transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
            {error && (
              <div className="mb-4 bg-accent-destructive/10 border border-accent-destructive/30 p-3 rounded-lg text-accent-destructive flex items-start shadow-sm">
                <AlertTriangle size={20} className="mr-2 mt-0.5 text-accent-destructive flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={20} className="text-muted" />
                        </div>
                        <input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchTerm}
                        onInput={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm transition-shadow"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-subtle"
                                aria-label="Clear search"
                            >
                                <XCircle size={18} />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleOpenCreateExerciseModal}
                        title="Create New Exercise"
                        className="p-2.5 bg-accent-emphasis hover:bg-accent-emphasis-hover text-on-accent rounded-lg shadow-sm transition-colors flex items-center justify-center"
                    >
                        <PlusCircle size={20} />
                    </button>
                </div>

                <div>
                  <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Filter by type:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(EXERCISE_TYPES).map(typeKey => (
                      <button
                        key={typeKey}
                        onClick={() => handleExerciseTypeClick(typeKey)}
                        className={`px-3.5 py-1.5 text-sm rounded-full border-2 transition-all duration-150 ease-in-out font-medium
                          ${selectedExerciseType === typeKey
                            ? 'bg-accent-emphasis text-on-accent border-accent-emphasis shadow-md hover:bg-accent-emphasis-hover'
                            : 'bg-app text-default border-strong hover:border-accent-emphasis hover:text-accent-emphasis'}`}
                      >
                        {EXERCISE_TYPE_LABELS[typeKey]}
                      </button>
                    ))}
                     {selectedExerciseType && (
                        <button
                            onClick={() => handleExerciseTypeClick(selectedExerciseType)}
                            className="px-3 py-1.5 text-sm rounded-full border-2 border-strong bg-surface-alt text-muted hover:bg-active hover:border-strong flex items-center gap-1"
                            title="Clear type filter"
                        >
                            <XCircle size={14} /> Clear Type
                        </button>
                    )}
                  </div>
                </div>

                {availableMuscles.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Filter by muscle group:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableMuscles.map(muscle => (
                        <button
                          key={muscle}
                          onClick={() => handleMuscleClick(muscle)}
                          className={`px-3.5 py-1.5 text-sm rounded-full border-2 transition-all duration-150 ease-in-out font-medium
                            ${selectedMuscles.includes(muscle)
                              ? 'bg-accent-emphasis text-on-accent border-accent-emphasis shadow-md hover:bg-accent-emphasis-hover'
                              : 'bg-app text-default border-strong hover:border-accent-emphasis hover:text-accent-emphasis'}`}
                        >
                          {muscle}
                        </button>
                      ))}
                      {selectedMuscles.length > 0 && (
                          <button
                              onClick={() => setSelectedMuscles([])}
                              className="px-3 py-1.5 text-sm rounded-full border-2 border-strong bg-surface-alt text-muted hover:bg-active hover:border-strong flex items-center gap-1"
                              title="Clear all muscle filters"
                          >
                              <XCircle size={14} /> Clear Muscles
                          </button>
                      )}
                    </div>
                  </div>
                )}

                {loading && <div className="flex justify-center py-8"><Loader2 size={36} className="animate-spin text-accent-emphasis" /></div>}

                {!loading && exercisesToDisplay.length > 0 && (
                  <div className="max-h-[calc(90vh-380px)] sm:max-h-[calc(90vh-360px)] overflow-y-auto space-y-2 pr-1 -mr-1 mt-3">
                    {exercisesToDisplay.map(exercise => (
                      <button
                        key={exercise.id || exercise.name}
                        onClick={() => handleExerciseSelect(exercise)}
                        className="w-full text-left p-3.5 bg-app hover:bg-accent-subtle-bg border border-subtle rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-emphasis/50 focus:border-accent-emphasis"
                      >
                        <p className="font-semibold text-default text-md">{exercise.name}</p>
                        {exercise.muscles && typeof exercise.muscles === 'string' && (
  <p className="text-xs text-accent-emphasis font-medium mt-0.5">
    {exercise.muscles} {/* Simply display the string */}
  </p>
)}
                        {exercise.type_ && <p className="text-xs text-muted mt-0.5">Type: {EXERCISE_TYPE_LABELS[exercise.type_] || exercise.type_}</p>}
                      </button>
                    ))}
                  </div>
                )}
                
                {!loading && exercisesToDisplay.length === 0 && (
                  noFiltersActive ? (
                    initialExerciseCount === 0 ? (
                      <p className="text-center text-muted py-6">No exercises defined yet. Try creating one!</p>
                    ) : (
                      <p className="text-center text-muted py-6">Search for an exercise or apply filters to see results.</p>
                    )
                  ) : (
                    <p className="text-center text-muted py-6">No exercises found matching your criteria.</p>
                  )
                )}
              </div>
            )}

            {step === 2 && selectedExercise && (
              <form onSubmit={handleSubmitWorkout} className="space-y-4 sm:space-y-5">
                {selectedExercise.type_ === EXERCISE_TYPES.BODYWEIGHT && (
                  <div className="mb-1 p-2.5 bg-accent-subtle-bg border border-accent-emphasis border-opacity-30 rounded-lg text-sm text-accent-emphasis shadow-sm">
                    This is a bodyweight exercise.
                    {userBodyweight != null ?
                      ` Your configured bodyweight (${userBodyweight} ${userBodyweightUnit}) will be used.` :
                      " Your bodyweight is not configured. Please set it in your profile/settings to log this exercise accurately."}
                  </div>
                )}

                {selectedExercise.log_reps && (
                  <div>
                    <label htmlFor="reps" className="block text-sm font-medium text-default mb-1">Reps</label>
                    <input type="number" name="reps" id="reps" value={logData.reps} onInput={handleLogDataChange} placeholder="e.g., 10" min="0"
                      className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
                  </div>
                )}
                {selectedExercise.log_weight && (
                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-default mb-1">Weight <span className="text-xs text-muted">(e.g., {userBodyweightUnit || 'units'})</span></label>
                    <input type="number" name="weight" id="weight" value={logData.weight} onInput={handleLogDataChange} placeholder="e.g., 50.5" step="0.1" min="0"
                      className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
                  </div>
                )}
                {selectedExercise.log_duration && (
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-default mb-1">Duration <span className="text-xs text-muted">(minutes)</span></label>
                    <input type="number" name="duration" id="duration" value={logData.duration} onInput={handleLogDataChange} placeholder="e.g., 30" min="0"
                      className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
                  </div>
                )}
                {selectedExercise.log_distance && (
                  <div>
                    <label htmlFor="distance" className="block text-sm font-medium text-default mb-1">Distance <span className="text-xs text-muted">(e.g., {userBodyweightUnit === 'lbs' ? 'miles' : 'km'})</span></label>
                    <input type="number" name="distance" id="distance" value={logData.distance} onInput={handleLogDataChange} placeholder="e.g., 5.2" step="0.01" min="0"
                      className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 mt-2">
                  <button type="button" onClick={() => { setStep(1); setError(null); fetchExercises(selectedExerciseType, selectedMuscles, searchTerm); }}
                    className="px-5 py-2 text-sm font-medium text-default bg-app hover:bg-surface-alt border border-strong rounded-lg shadow-sm transition-colors">
                    Back
                  </button>
                  <button type="submit" disabled={isSubmitting || !selectedExercise}
                    className="px-6 py-2.5 text-sm font-semibold text-on-accent bg-accent-emphasis hover:bg-accent-emphasis-hover rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                    Log Workout
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <CreateExerciseModal
        isOpen={isCreateExerciseModalOpen}
        onClose={() => setIsCreateExerciseModalOpen(false)}
        onExerciseCreated={handleExerciseCreated}
        availableMuscles={availableMuscles}
      />
    </>
  );
};

export default AddExerciseModal;
