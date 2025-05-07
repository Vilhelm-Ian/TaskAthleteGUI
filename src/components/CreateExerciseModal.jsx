// CreateExerciseModal.jsx
import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { X, Loader2, AlertTriangle, CheckSquare, Square } from 'lucide-preact';

const EXERCISE_TYPES = [
  { value: 'Resistance', label: 'Resistance (Weights)' },
  { value: 'BodyWeight', label: 'Bodyweight' },
  { value: 'Cardio', label: 'Cardio' },
];

const CreateExerciseModal = ({ isOpen, onClose, onExerciseCreated, availableMuscles: propAvailableMuscles }) => {
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseType, setExerciseType] = useState(''); // 'Resistance', 'BodyWeight', 'Cardio'
  const [musclesTargeted, setMusclesTargeted] = useState(''); // Comma-separated string
  const [logConfig, setLogConfig] = useState({
    reps: false,
    weight: false,
    duration: false,
    distance: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // For muscle input suggestions (optional enhancement, simple text for now)
  // const [allMuscles, setAllMuscles] = useState([]);
  // useEffect(() => {
  //   if (propAvailableMuscles) {
  //     setAllMuscles(propAvailableMuscles);
  //   } else {
  //     invoke('list_all_muscles').then(setAllMuscles).catch(console.error);
  //   }
  // }, [propAvailableMuscles]);


  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setExerciseName('');
      setExerciseType('');
      setMusclesTargeted('');
      setLogConfig({ reps: false, weight: false, duration: false, distance: false });
      setError(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Set default loggable metrics based on exercise type
    let newLogConfig = { reps: false, weight: false, duration: false, distance: false };
    if (exerciseType === 'BodyWeight') {
      newLogConfig.reps = true;
    } else if (exerciseType === 'Resistance') {
      newLogConfig.reps = true;
      newLogConfig.weight = true;
    } else if (exerciseType === 'Cardio') {
      newLogConfig.duration = true;
      // newLogConfig.distance = true; // Optional: enable distance for cardio by default
    }
    setLogConfig(newLogConfig);
  }, [exerciseType]);

  const handleLogConfigChange = (metric) => {
    setLogConfig(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!exerciseName.trim()) {
      setError("Exercise name is required.");
      return;
    }
    if (!exerciseType) {
      setError("Exercise type is required.");
      return;
    }
    // Basic validation for muscles: allow empty, or non-empty must not be just commas/spaces
    const cleanedMuscles = musclesTargeted.split(',').map(m => m.trim()).filter(Boolean).join(', ');


    setIsSubmitting(true);

    const payload = {
      name: exerciseName.trim(),
      typeStr: exerciseType, 
      muscles: cleanedMuscles ? cleanedMuscles : null,
      logReps: logConfig.reps,     
      logWeight: logConfig.weight,   
      logDuration: logConfig.duration, 
      logDistance: logConfig.distance, 
    };


    try {
      const newExerciseId = await invoke('create_exercise', payload);
      setSuccessMessage(`Exercise "${payload.name}" created successfully!`); // Removed ID for simplicity
      if (onExerciseCreated) {
        onExerciseCreated(payload.name); 
      }
      setTimeout(() => {
         onClose(); 
      }, 1500);
    } catch (err) {
      console.error("Create exercise error:", err);
      setError(typeof err === 'string' ? err : (err.message || "Failed to create exercise."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[101] backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-subtle">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-subtle bg-app">
          <h2 className="text-xl sm:text-2xl font-semibold text-default">Create New Exercise</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted hover:bg-surface-alt hover:text-subtle transition-colors"
            aria-label="Close modal"
          >
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
            <input
              type="text" name="exerciseName" id="exerciseName"
              value={exerciseName} onInput={(e) => setExerciseName(e.target.value)}
              placeholder="e.g., Barbell Squat"
              required
              className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="exerciseType" className="block text-sm font-medium text-default mb-1">Exercise Type *</label>
            <select
              name="exerciseType" id="exerciseType"
              value={exerciseType} onChange={(e) => setExerciseType(e.target.value)}
              required
              className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm appearance-none"
            >
              <option value="" disabled className="text-muted">Select type...</option>
              {EXERCISE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="musclesTargeted" className="block text-sm font-medium text-default mb-1">
              Muscles Targeted <span className="text-xs text-muted">(comma-separated, e.g., Quads, Glutes)</span>
            </label>
            <input
              type="text" name="musclesTargeted" id="musclesTargeted"
              value={musclesTargeted} onInput={(e) => setMusclesTargeted(e.target.value)}
              placeholder="e.g., Chest, Triceps, Shoulders"
              className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm"
            />
            {/* Optional: Display available muscles for reference or selection */}
            {/* {allMuscles.length > 0 && (
              <p className="text-xs text-muted mt-1">Available: {allMuscles.join(', ')}</p>
            )} */}
          </div>

          <div>
            <p className="block text-sm font-medium text-default mb-2">Loggable Metrics:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Object.keys(logConfig).map(metric => (
                <label key={metric} className="flex items-center space-x-2 cursor-pointer p-1.5 rounded-md hover:bg-surface-alt">
                  <input
                    type="checkbox"
                    checked={logConfig[metric]}
                    onChange={() => handleLogConfigChange(metric)}
                    className="h-5 w-5 accent-[var(--color-accent-emphasis)] border-subtle rounded focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--color-bg-surface)] focus:ring-accent-subtle-bg"
                  />
                  <span className="text-sm text-default capitalize">{metric}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-subtle">
             <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-default bg-app hover:bg-surface-alt border border-strong rounded-lg shadow-sm transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || successMessage}
              className="px-6 py-2.5 text-sm font-semibold text-on-accent bg-accent-emphasis hover:bg-accent-emphasis-hover rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {successMessage ? 'Created!' : 'Create Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExerciseModal;
