import { h } from 'preact';

const EXERCISE_TYPES = { BODYWEIGHT: 'BodyWeight' };

const LogDetailsStep = ({
  selectedExercise,
  logData,
  onLogDataChange,
  userBodyweight,
  userBodyweightUnit,
}) => {
  if (!selectedExercise) return <p>Error: No exercise selected for logging.</p>;

  // Helper to handle increment/decrement
  const adjustValue = (field, delta) => {
    const currentValue = parseFloat(logData[field]) || 0;
    const step = field === 'weight' ? 0.1 : field === 'distance' ? 0.01 : 1;
    const newValue = Math.max(0, parseFloat((currentValue + delta * step).toFixed(2)));
    onLogDataChange({ target: { name: field, value: newValue } });
  };

  return (
    <form className="space-y-4 sm:space-y-5">
      {selectedExercise.type_ === EXERCISE_TYPES.BODYWEIGHT && (
        <div className="mb-1 p-2.5 bg-accent-subtle-bg border border-accent-emphasis/30 rounded-lg text-sm text-accent-emphasis shadow-sm">
          This is a bodyweight exercise.
          {userBodyweight != null
            ? ` Your configured bodyweight (${userBodyweight} ${userBodyweightUnit}) will be used.`
            : " Your bodyweight is not configured. Please set it in your profile/settings to log this exercise accurately."}
        </div>
      )}

      {selectedExercise.log_reps && (
        <div>
          <label htmlFor="reps" className="block text-sm font-medium text-default mb-1">Reps</label>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => adjustValue('reps', -1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-l-lg text-default focus:outline-none"
            >
              -
            </button>
            <input
              type="number"
              name="reps"
              id="reps"
              value={logData.reps}
              onInput={onLogDataChange}
              placeholder="e.g., 10"
              min="0"
              className="w-full p-2.5 bg-surface text-default border-y border-subtle focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm"
            />
            <button
              type="button"
              onClick={() => adjustValue('reps', 1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-r-lg text-default focus:outline-none"
            >
              +
            </button>
          </div>
        </div>
      )}

      {selectedExercise.log_weight && (
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-default mb-1">
            Weight <span className="text-xs text-muted">(e.g., {userBodyweightUnit || 'units'})</span>
          </label>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => adjustValue('weight', -1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-l-lg text-default focus:outline-none"
            >
              -
            </button>
            <input
              type="number"
              name="weight"
              id="weight"
              value={logData.weight}
              onInput={onLogDataChange}
              placeholder="e.g., 50.5"
              step="0.1"
              min="0"
              className="w-full p-2.5 bg-surface text-default border-y border-subtle focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm"
            />
            <button
              type="button"
              onClick={() => adjustValue('weight', 1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-r-lg text-default focus:outline-none"
            >
              +
            </button>
          </div>
        </div>
      )}

      {selectedExercise.log_duration && (
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-default mb-1">
            Duration <span className="text-xs text-muted">(minutes)</span>
          </label>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => adjustValue('duration', -1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-l-lg text-default focus:outline-none"
            >
              -
            </button>
            <input
              type="number"
              name="duration"
              id="duration"
              value={logData.duration}
              onInput={onLogDataChange}
              placeholder="e.g., 30"
              min="0"
              className="w-full p-2.5 bg-surface text-default border-y border-subtle focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm"
            />
            <button
              type="button"
              onClick={() => adjustValue('duration', 1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-r-lg text-default focus:outline-none"
            >
              +
            </button>
          </div>
        </div>
      )}

      {selectedExercise.log_distance && (
        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-default mb-1">
            Distance <span className="text-xs text-muted">(e.g., {userBodyweightUnit === 'lbs' ? 'miles' : 'km'})</span>
          </label>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => adjustValue('distance', -1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-l-lg text-default focus:outline-none"
            >
              -
            </button>
            <input
              type="number"
              name="distance"
              id="distance"
              value={logData.distance}
              onInput={onLogDataChange}
              placeholder="e.g., 5.2"
              step="0.01"
              min="0"
              className="w-full p-2.5 bg-surface text-default border-y border-subtle focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm"
            />
            <button
              type="button"
              onClick={() => adjustValue('distance', 1)}
              className="px-3 py-2 bg-surface border border-subtle rounded-r-lg text-default focus:outline-none"
            >
              +
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default LogDetailsStep;
