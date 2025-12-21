import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { X, Loader2, AlertTriangle } from 'lucide-preact'; 
import CreateExerciseModal from './CreateExerciseModal';
import ExerciseSelectionStep from './ExerciseSelectionStep';
import LogDetailsStep from './LogDetailsStep';

const EXERCISE_TYPES_CONST = { BODYWEIGHT: 'BodyWeight' };

// Helper to safely parse numeric inputs
const parseNumericInput = (value, parser) => {
    if (value == null || String(value).trim() === "") return undefined;
    const parsed = parser(value);
    return isNaN(parsed) ? undefined : parsed;
};

const AddExerciseModal = ({ 
  isOpen, 
  onClose, 
  currentDateKey, 
  onActionCompleted,
  preSelectedExercise: preSelectedExerciseProp,
  initialLogData: initialLogDataProp,
  editingWorkoutLogId
}) => {
  const [step, setStep] = useState(1);
  const [count, setCount] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [logData, setLogData] = useState({ reps: '', weight: '', duration: '', distance: '' });
  const [configLoading, setConfigLoading] = useState(true);
  const [userBodyweight, setUserBodyweight] = useState(null);
  const [userBodyweightUnit, setUserBodyweightUnit] = useState('kg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Edit/Create Modal State
  const [isCreateExerciseModalOpen, setIsCreateExerciseModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState(null);
  const [availableMusclesForCreate, setAvailableMusclesForCreate] = useState([]);

  const isEditMode = !!editingWorkoutLogId;

  const fetchUserConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const configData = await invoke('get_config');
      if (configData) {
        let bodyweights = await invoke("get_body_weights") 
        if(bodyweights && bodyweights.length > 0) setUserBodyweight(bodyweights[0][2]);
        if (configData.units) {
            const unitSystem = typeof configData.units === 'string' ? configData.units.toLowerCase() : (configData.units.weight || 'kg');
            setUserBodyweightUnit(unitSystem === 'imperial' ? 'lbs' : 'kg');
        }
      }
    } catch (err) {
      console.error("Modal user config fetch error:", err);
      setError(err.message || "Failed to load user configuration.");
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError(null);
      fetchUserConfig();

      if (preSelectedExerciseProp) {
        setSelectedExercise(preSelectedExerciseProp);
        setLogData(initialLogDataProp || { reps: '', weight: '', duration: '', distance: '' });
        setStep(2);
      } else {
        setStep(1);
        setSelectedExercise(null);
        setLogData({ reps: '', weight: '', duration: '', distance: '' });
      }
    } else {
        setStep(1);
        setSelectedExercise(null);
        setLogData({ reps: '', weight: '', duration: '', distance: '' });
    }
  }, [isOpen, preSelectedExerciseProp, initialLogDataProp, editingWorkoutLogId, fetchUserConfig]);

  const handleExerciseSelectFromStep1 = useCallback(async (exerciseDef) => {
    setSelectedExercise(exerciseDef);
    const baseLogData = { reps: '', weight: '', duration: '', distance: '' };
    setLogData(baseLogData);
    setStep(2);
    setError(null);

    if (exerciseDef && exerciseDef.name && !initialLogDataProp) {
        try {
            const previousWorkouts = await invoke('get_previous_workout_details', {
                payload: { identifier: exerciseDef.name, n: 1 }
            });
            if (previousWorkouts && previousWorkouts.length > 0) {
                const prev = previousWorkouts[0];
                const newLogData = {}; 
                if (exerciseDef.log_reps && prev.reps != null) newLogData.reps = prev.reps.toString();
                if (exerciseDef.log_weight && prev.weight != null) newLogData.weight = prev.weight.toString();
                if (exerciseDef.log_duration && prev.duration_minutes != null) newLogData.duration = prev.duration_minutes.toString();
                if (exerciseDef.log_distance && prev.distance != null) newLogData.distance = prev.distance.toString();
                setLogData(current => ({...baseLogData, ...newLogData}));
            }
        } catch (err) {
            console.warn(`Could not fetch previous workout data:`, err);
        }
    }
  }, [initialLogDataProp]);

  const handleLogDataChange = useCallback((e) => {
    const { name, value } = e.target;
    setLogData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmitWorkout = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !currentDateKey) return;

    let hasMetrics = false;
    if (selectedExercise.log_reps && String(logData.reps).trim()) hasMetrics = true;
    if (selectedExercise.log_weight && String(logData.weight).trim()) hasMetrics = true;
    if (selectedExercise.log_duration && String(logData.duration).trim()) hasMetrics = true;
    if (selectedExercise.log_distance && String(logData.distance).trim()) hasMetrics = true;

    if (!hasMetrics) {
        let msg = "Please enter at least one value for: ";
        if(selectedExercise.log_reps) msg += "Reps, "; if(selectedExercise.log_weight) msg += "Weight, ";
        if(selectedExercise.log_duration) msg += "Duration, "; if(selectedExercise.log_distance) msg += "Distance, ";
        setError(msg.trim().replace(/,$/, '') + "."); return;
    }

    setIsSubmitting(true); setError(null);

    try {
      if (isEditMode) {
        const editPayloadRaw = {
          id: editingWorkoutLogId,
          new_reps: selectedExercise.log_reps ? parseNumericInput(logData.reps, parseInt) : undefined,
          new_duration: selectedExercise.log_duration ? parseNumericInput(logData.duration, parseInt) : undefined,
          new_distance_arg: selectedExercise.log_distance ? parseNumericInput(logData.distance, parseFloat) : undefined,
          new_weight: undefined,
          new_bodyweight: undefined,
        };

        let weightFieldChangedInForm = false;
        if (selectedExercise.log_weight) {
            const initialWeightValueStr = String(initialLogDataProp?.weight || "");
            if (String(logData.weight) !== initialWeightValueStr) {
                weightFieldChangedInForm = true;
            }
        }
        
        if (selectedExercise.type_ === EXERCISE_TYPES_CONST.BODYWEIGHT) {
            if (weightFieldChangedInForm && selectedExercise.log_weight) { 
                if (userBodyweight != null && !isNaN(userBodyweight)) {
                    const additionalWeight = parseNumericInput(logData.weight, parseFloat) || 0;
                    editPayloadRaw.new_weight = userBodyweight + additionalWeight; 
                } else { setError("User bodyweight not configured for BW+ exercise edit."); setIsSubmitting(false); return; }
            }
        } else { 
            if (weightFieldChangedInForm && selectedExercise.log_weight) {
                 if (String(logData.weight).trim() === "") {
                    editPayloadRaw.new_weight = null; 
                } else {
                    editPayloadRaw.new_weight = parseNumericInput(logData.weight, parseFloat);
                }
            }
        }
        
        const finalEditPayload = Object.fromEntries(Object.entries(editPayloadRaw).filter(([, value]) => value !== undefined));
        
        if (Object.keys(finalEditPayload).length <= 1 && finalEditPayload.id) {
             console.warn("Edit: No changes detected to send.");
             onActionCompleted(null); onClose(); setIsSubmitting(false); return; 
        }
        await invoke('edit_workout', { params: finalEditPayload });
        onActionCompleted(null);

      } else { 
        const addPayload = {
          exercise_identifier: selectedExercise.name, sets: 1, 
          date: `${currentDateKey}T12:00:00Z`,
          reps: selectedExercise.log_reps ? parseNumericInput(logData.reps, parseInt) : undefined,
          weight: selectedExercise.log_weight ? parseNumericInput(logData.weight, parseFloat) : undefined,
          duration: selectedExercise.log_duration ? parseNumericInput(logData.duration, parseInt) : undefined,
          distance: selectedExercise.log_distance ? parseNumericInput(logData.distance, parseFloat) : undefined,
          bodyweight_to_use: undefined,
        };

        if (selectedExercise.type_ === EXERCISE_TYPES_CONST.BODYWEIGHT) {
          if (userBodyweight != null && !isNaN(userBodyweight)) {
            addPayload.bodyweight_to_use = userBodyweight;
          } else { setError("Your bodyweight is not configured."); setIsSubmitting(false); return; }
        }
        
        const [, pbInfo] = await invoke('add_workout', { params: addPayload }); 
        onActionCompleted(pbInfo);
      }
      onClose();
    } catch (err) {
      console.error(`Submit error (${isEditMode ? 'edit' : 'add'}):`, err);
      setError(err.message || `Failed to ${isEditMode ? 'save' : 'log'}.`);
    } finally { setIsSubmitting(false); }
  };

  const handleOpenCreateExerciseModal = () => {
      setExerciseToEdit(null);
      setIsCreateExerciseModalOpen(true);
  };

  const handleEditExercise = (exercise) => {
      setExerciseToEdit(exercise);
      setIsCreateExerciseModalOpen(true);
  };
  
  const handleExerciseSaved = () => {
    setIsCreateExerciseModalOpen(false);
    setExerciseToEdit(null);
    setCount(v => v + 1); // Triggers refresh in step 1
  };

  const handleStep1InitialDataLoaded = useCallback((muscles) => {
    setAvailableMusclesForCreate(muscles);
  }, []);

  if (!isOpen) return null;
  const getEffectiveTitle = () => step === 1 ? 'Select Exercise' : (isEditMode ? `Edit Log: ${selectedExercise?.name}` : `Log: ${selectedExercise?.name}`);
  const showHeaderBackButton = step === 2 && !preSelectedExerciseProp;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
        <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-subtle">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-subtle bg-app">
            <h2 className="text-xl sm:text-2xl font-semibold text-default flex items-center">
                {showHeaderBackButton && (
                    <button type="button" onClick={() => { setStep(1); setError(null); setSelectedExercise(null); setLogData({ reps: '', weight: '', duration: '', distance: '' }); }} className="mr-3 p-1.5 rounded-full text-subtle hover:bg-surface-alt hover:text-default transition-colors" aria-label="Back"></button>
                )}
                {getEffectiveTitle()}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full text-muted hover:bg-surface-alt hover:text-subtle transition-colors" aria-label="Close modal"><X size={24} /></button>
          </div>

          <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
            {error && (step === 2 || !selectedExercise) && ( 
                <div className="mb-4 bg-accent-destructive/10 border border-accent-destructive/30 p-3 rounded-lg text-accent-destructive flex items-start shadow-sm">
                <AlertTriangle size={20} className="mr-2 mt-0.5 text-accent-destructive flex-shrink-0" /> <p className="text-sm">{error}</p> </div>
            )}

            {step === 1 && (
              <ExerciseSelectionStep
                count={count}
                onExerciseSelect={handleExerciseSelectFromStep1}
                onOpenCreateExerciseModal={handleOpenCreateExerciseModal}
                onEditExercise={handleEditExercise} 
                onDeleteSuccess={() => setCount(c => c + 1)}
                onInitialDataLoaded={handleStep1InitialDataLoaded} 
              />
            )}

            {step === 2 && selectedExercise && !configLoading && (
              <>
                <LogDetailsStep selectedExercise={selectedExercise} logData={logData} onLogDataChange={handleLogDataChange} userBodyweight={userBodyweight} userBodyweightUnit={userBodyweightUnit} />
                <div className="flex items-center justify-end gap-3 pt-4 mt-3 border-t border-subtle">
                  <button type="button" onClick={() => { setStep(1); setError(null); setSelectedExercise(null); }} className="px-5 py-2 text-sm font-medium text-default bg-app hover:bg-surface-alt border border-strong rounded-lg shadow-sm transition-colors">Back</button>
                  <button type="button" onClick={handleSubmitWorkout} disabled={isSubmitting || !selectedExercise} className="px-6 py-2.5 text-sm font-semibold text-on-accent bg-accent-emphasis hover:bg-accent-emphasis-hover rounded-lg shadow-md transition-colors disabled:opacity-60 flex items-center justify-center min-w-[120px]">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null} {isSubmitting ? (isEditMode ? "Saving..." : "Logging...") : (isEditMode ? "Save Changes" : "Log Workout")}
                  </button>
                </div>
              </>
            )}
             {step === 2 && configLoading && (<div className="flex justify-center py-8"><Loader2 size={36} className="animate-spin text-accent-emphasis" /> <span className="ml-2">Loading details...</span></div>)}
          </div>
        </div>
      </div>

      <CreateExerciseModal
        isOpen={isCreateExerciseModalOpen}
        onClose={() => setIsCreateExerciseModalOpen(false)}
        onExerciseCreated={handleExerciseSaved}
        availableMuscles={availableMusclesForCreate}
        exerciseToEdit={exerciseToEdit}
      />
    </>
  );
};

export default AddExerciseModal;
