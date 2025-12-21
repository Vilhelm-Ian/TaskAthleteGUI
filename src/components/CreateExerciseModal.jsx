import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { X, Loader2, AlertTriangle, CheckSquare } from 'lucide-preact';

const EXERCISE_TYPES = [
  { value: 'Resistance', label: 'Resistance (Weights)' },
  { value: 'BodyWeight', label: 'Bodyweight' },
  { value: 'Cardio', label: 'Cardio' },
];

const CreateExerciseModal = ({ isOpen, onClose, onExerciseCreated, exerciseToEdit }) => {
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [musclesTargeted, setMusclesTargeted] = useState('');
  const [logConfig, setLogConfig] = useState({
    reps: false,
    weight: false,
    duration: false,
    distance: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setIsSubmitting(false);

      if (exerciseToEdit) {
        setExerciseName(exerciseToEdit.name);
        setExerciseType(exerciseToEdit.type_ || exerciseToEdit.type);
        setMusclesTargeted(exerciseToEdit.muscles || '');
        setLogConfig({
          reps: exerciseToEdit.log_reps,
          weight: exerciseToEdit.log_weight,
          duration: exerciseToEdit.log_duration,
          distance: exerciseToEdit.log_distance,
        });
      } else {
        setExerciseName('');
        setExerciseType('');
        setMusclesTargeted('');
        setLogConfig({ reps: false, weight: false, duration: false, distance: false });
      }
    }
  }, [isOpen, exerciseToEdit]);

  // If type changes in create mode, set defaults. In edit mode, preserve unless user manually changes config.
  useEffect(() => {
    if (!exerciseToEdit && exerciseType && isOpen) {
       let newLogConfig = { reps: false, weight: false, duration: false, distance: false };
       if (exerciseType === 'BodyWeight') {
         newLogConfig.reps = true;
       } else if (exerciseType === 'Resistance') {
         newLogConfig.reps = true;
         newLogConfig.weight = true;
       } else if (exerciseType === 'Cardio') {
         newLogConfig.duration = true;
       }
       setLogConfig(newLogConfig);
    }
  }, [exerciseType, isOpen, exerciseToEdit]);

  const handleLogConfigChange = (metric) => {
    setLogConfig(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!exerciseName.trim()) { setError("Exercise name is required."); return; }
    if (!exerciseType) { setError("Exercise type is required."); return; }
    
    const cleanedMuscles = musclesTargeted.split(',').map(m => m.trim()).filter(Boolean).join(', ');
    setIsSubmitting(true);

    try {
      if (exerciseToEdit) {
        // Edit Mode
        // We only send newMuscles if it changed. Sending null clears it, undefined/missing ignores it.
        const originalMuscles = exerciseToEdit.muscles || '';
        let newMusclesArg = undefined;
        if (cleanedMuscles !== originalMuscles) {
             newMusclesArg = cleanedMuscles || null; // null to clear if empty
        }

        await invoke('edit_exercise', {
            identifier: exerciseToEdit.name,
            newName: exerciseName.trim() === exerciseToEdit.name ? null : exerciseName.trim(),
            newTypeStr: exerciseType === (exerciseToEdit.type_ || exerciseToEdit.type) ? null : exerciseType,
            newMuscles: newMusclesArg,
            logReps: logConfig.reps,
            logWeight: logConfig.weight,
            logDuration: logConfig.duration,
            logDistance: logConfig.distance,
        });
        setSuccessMessage(`Exercise updated successfully!`);
      } else {
        // Create Mode
        const payload = {
            name: exerciseName.trim(),
            typeStr: exerciseType, 
            muscles: cleanedMuscles ? cleanedMuscles : null,
            logReps: logConfig.reps,     
            logWeight: logConfig.weight,   
            logDuration: logConfig.duration, 
            logDistance: logConfig.distance, 
        };
        await invoke('create_exercise', payload);
        setSuccessMessage(`Exercise created successfully!`);
      }

      if (onExerciseCreated) onExerciseCreated();
      
      setTimeout(() => { onClose(); }, 1500);
    } catch (err) {
      console.error("Save exercise error:", err);
      setError(typeof err === 'string' ? err : (err.message || "Failed to save exercise."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[101] backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-subtle">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-subtle bg-app">
          <h2 className="text-xl sm:text-2xl font-semibold text-default">
            {exerciseToEdit ? 'Edit Exercise' : 'Create New Exercise'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-muted hover:bg-surface-alt hover:text-subtle transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex-grow overflow-y-auto space-y-4 sm:space-y-5">
          {error && (
            <div className="mb-4 bg-accent-destructive/10 border border-accent-destructive/30 p-3 rounded-lg text-accent-destructive flex items-start shadow-sm">
              <AlertTriangle size={20} className="mr-2 mt-0.5 text-accent-destructive flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 bg-accent-success/10 border border-accent-success/30 p-3 rounded-lg text-accent-success flex items-start shadow-sm">
              <CheckSquare size={20} className="mr-2 mt-0.5 text-accent-success flex-shrink-0" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}

          <div>
            <label htmlFor="exerciseName" className="block text-sm font-medium text-default mb-1">Exercise Name *</label>
            <input type="text" id="exerciseName" value={exerciseName} onInput={(e) => setExerciseName(e.target.value)} required className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
          </div>

          <div>
            <label htmlFor="exerciseType" className="block text-sm font-medium text-default mb-1">Exercise Type *</label>
            <select id="exerciseType" value={exerciseType} onChange={(e) => setExerciseType(e.target.value)} required className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm appearance-none">
              <option value="" disabled className="text-muted">Select type...</option>
              {EXERCISE_TYPES.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}
            </select>
          </div>

          <div>
            <label htmlFor="musclesTargeted" className="block text-sm font-medium text-default mb-1">Muscles Targeted <span className="text-xs text-muted">(comma-separated)</span></label>
            <input type="text" id="musclesTargeted" value={musclesTargeted} onInput={(e) => setMusclesTargeted(e.target.value)} className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
          </div>

          <div>
            <p className="block text-sm font-medium text-default mb-2">Loggable Metrics:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Object.keys(logConfig).map(metric => (
                <label key={metric} className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-md hover:bg-surface-alt">
                  <input type="checkbox" checked={logConfig[metric]} onChange={() => handleLogConfigChange(metric)} className="h-5 w-5 accent-[var(--color-accent-emphasis)] border-subtle rounded" />
                  <span className="text-sm text-default capitalize">{metric}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-subtle">
             <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-default bg-app hover:bg-surface-alt border border-strong rounded-lg shadow-sm transition-colors disabled:opacity-60">Cancel</button>
             <button type="submit" disabled={isSubmitting || successMessage} className="px-6 py-2.5 text-sm font-semibold text-on-accent bg-accent-emphasis hover:bg-accent-emphasis-hover rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
              {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {successMessage ? 'Saved!' : (exerciseToEdit ? 'Save Changes' : 'Create Exercise')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExerciseModal;
