// src-ui/components/LogDetailsStep.jsx
import { h } from 'preact';

const EXERCISE_TYPES = { BODYWEIGHT: 'BodyWeight' }; // Only need BODYWEIGHT for the check here

const LogDetailsStep = ({
  selectedExercise, // The ExerciseDefinition object
  logData,          // Object: { reps, weight, duration, distance }
  onLogDataChange,  // Function to update logData in parent
  userBodyweight,
  userBodyweightUnit,
  // isEditMode, // Not directly used in this component's rendering for now, but could be
}) => {
  if (!selectedExercise) return <p>Error: No exercise selected for logging.</p>;

  return (
    <form className="space-y-4 sm:space-y-5"> {/* Form tag is for semantics, submit handled by parent */}
      {selectedExercise.type_ === EXERCISE_TYPES.BODYWEIGHT && (
        <div className="mb-1 p-2.5 bg-accent-subtle-bg border border-accent-emphasis/30 rounded-lg text-sm text-accent-emphasis shadow-sm">
          This is a bodyweight exercise.
          {userBodyweight != null ? ` Your configured bodyweight (${userBodyweight} ${userBodyweightUnit}) will be used.` : " Your bodyweight is not configured. Please set it in your profile/settings to log this exercise accurately."}
        </div>
      )}

      {selectedExercise.log_reps && (
        <div>
          <label htmlFor="reps" className="block text-sm font-medium text-default mb-1">Reps</label>
          <input type="number" name="reps" id="reps" value={logData.reps} onInput={onLogDataChange} placeholder="e.g., 10" min="0" className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
        </div>
      )}
      {selectedExercise.log_weight && (
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-default mb-1">Weight <span className="text-xs text-muted">(e.g., {userBodyweightUnit || 'units'})</span></label>
          <input type="number" name="weight" id="weight" value={logData.weight} onInput={onLogDataChange} placeholder="e.g., 50.5" step="0.1" min="0" className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
        </div>
      )}
      {selectedExercise.log_duration && (
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-default mb-1">Duration <span className="text-xs text-muted">(minutes)</span></label>
          <input type="number" name="duration" id="duration" value={logData.duration} onInput={onLogDataChange} placeholder="e.g., 30" min="0" className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
        </div>
      )}
      {selectedExercise.log_distance && (
        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-default mb-1">Distance <span className="text-xs text-muted">(e.g., {userBodyweightUnit === 'lbs' ? 'miles' : 'km'})</span></label>
          <input type="number" name="distance" id="distance" value={logData.distance} onInput={onLogDataChange} placeholder="e.g., 5.2" step="0.01" min="0" className="w-full p-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm" />
        </div>
      )}
      {/* Submit/Back buttons will be in the parent AddExerciseModal */}
    </form>
  );
};

export default LogDetailsStep;
