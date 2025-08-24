// src-ui/components/ExerciseSelectionStep.jsx
import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, AlertTriangle, Search, XCircle, PlusCircle } from 'lucide-preact';

const EXERCISE_TYPES = { BODYWEIGHT: 'BodyWeight', RESISTANCE: 'Resistance', CARDIO: 'Cardio' };
const EXERCISE_TYPE_LABELS = { [EXERCISE_TYPES.BODYWEIGHT]: 'Bodyweight', [EXERCISE_TYPES.RESISTANCE]: 'Resistance', [EXERCISE_TYPES.CARDIO]: 'Cardio' };

const ExerciseSelectionStep = ({ onExerciseSelect, onOpenCreateExerciseModal, onInitialDataLoaded, count }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [exercisesToDisplay, setExercisesToDisplay] = useState([]);
  const [availableMuscles, setAvailableMuscles] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [selectedExerciseType, setSelectedExerciseType] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialExerciseCount, setInitialExerciseCount] = useState(0);

  const fetchInitialStep1Data = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [musclesData, allExercisesInitial] = await Promise.all([
        invoke('list_all_muscles'),
        invoke('list_exercises', { typeFilterStr: null, muscleFilter: null }) // To get initial count and display
      ]);
      setAvailableMuscles(musclesData || []);
      const count = allExercisesInitial ? allExercisesInitial.length : 0;
      setInitialExerciseCount(count);
      
      // Initially display all exercises if count > 0, or let filter effect handle it
      if (count > 0 && !searchTerm && !selectedExerciseType && selectedMuscles.length === 0) {
        setExercisesToDisplay(allExercisesInitial || []);
      } else {
        // If filters might be active from a previous interaction (though state is reset),
        // or if count is 0, this will be handled by the fetchExercisesOnFilterChange effect.
        setExercisesToDisplay([]); // Start empty, let filter effect populate
      }
      if (onInitialDataLoaded) onInitialDataLoaded(musclesData || []);

    } catch (err) {
      console.error("Step 1 initial data fetch error:", err);
      setError(typeof err === 'string' ? err : (err.message || "Failed to load exercise data."));
      setAvailableMuscles([]);
      setInitialExerciseCount(0);
      setExercisesToDisplay([]);
    } finally {
      setLoading(false);
    }
  }, [onInitialDataLoaded, count]); // Added onInitialDataLoaded

  const fetchExercisesOnFilterChange = useCallback(async () => {
    // Don't fetch if initial data is still loading
    if (loading && initialExerciseCount === 0 && availableMuscles.length === 0) return;

    setLoading(true); // Loading for filter application
    setError(null);
    try {
      let fetched = await invoke('list_exercises', {
        typeFilterStr: selectedExerciseType,
        musclesFilter: selectedMuscles.length > 0 ? selectedMuscles : null,
      });
      
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        if (lowerSearchTerm) {
            fetched = (fetched || []).filter(ex => ex.name.toLowerCase().includes(lowerSearchTerm));
        }
      }
      setExercisesToDisplay(fetched || []);
    } catch (err) {
      console.error("Step 1 fetch exercises error:", err);
      setError(typeof err === 'string' ? err : (err.message || "Failed to load exercises."));
      setExercisesToDisplay([]);
    } finally {
      setLoading(false);
    }
  }, [selectedExerciseType, selectedMuscles, searchTerm]); // Removed loading, initialExerciseCount, availableMuscles

  // Effect for initial data load
  useEffect(() => {
    fetchInitialStep1Data();
  }, [fetchInitialStep1Data, count]);

  // Effect for fetching exercises when filters or search term change
  useEffect(() => {
    // Avoid running this if fetchInitialStep1Data is still effectively loading the base set.
    // The initial fetchInitialStep1Data can populate the list directly or let this handle it.
    // For simplicity, let this always run after initial load completes, or if filters change.
    // Add a debounce for search term.
    const timeoutId = setTimeout(() => {
        // If not loading from initial fetch, then apply filters.
        // This condition is tricky. Let's simplify: if it's not the very first render,
        // or if filters are active, fetch.
        fetchExercisesOnFilterChange();
    }, searchTerm ? 300 : 0); // Debounce only for search term

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedMuscles, selectedExerciseType, fetchExercisesOnFilterChange]);


  const handleMuscleClick = (muscle) => {
    setSelectedMuscles(prev => prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]);
  };

  const handleExerciseTypeClick = (type) => {
    setSelectedExerciseType(prev => (prev === type ? null : type));
  };
  
  const noFiltersActive = !searchTerm.trim() && selectedMuscles.length === 0 && !selectedExerciseType;

  return (
    <div className="space-y-4 sm:space-y-5">
      {error && (
        <div className="mb-4 bg-accent-destructive/10 border border-accent-destructive/30 p-3 rounded-lg text-accent-destructive flex items-start shadow-sm">
          <AlertTriangle size={20} className="mr-2 mt-0.5 text-accent-destructive flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={20} className="text-muted" /></div>
          <input type="text" placeholder="Search exercises..." value={searchTerm} onInput={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm transition-shadow"/>
          {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-subtle" aria-label="Clear search"><XCircle size={18} /></button>)}
        </div>
        <button type="button" onClick={onOpenCreateExerciseModal} title="Create New Exercise" className="p-2.5 bg-accent-emphasis hover:bg-accent-emphasis-hover text-on-accent rounded-lg shadow-sm transition-colors flex items-center justify-center"><PlusCircle size={20} /></button>
      </div>

      <div>
        <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Filter by type:</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(EXERCISE_TYPES).map(typeKey => (<button key={typeKey} onClick={() => handleExerciseTypeClick(typeKey)} className={`px-3.5 py-1.5 text-sm rounded-full border-2 transition-all duration-150 ease-in-out font-medium ${selectedExerciseType === typeKey ? 'bg-accent-emphasis text-on-accent border-accent-emphasis shadow-md hover:bg-accent-emphasis-hover' : 'bg-app text-default border-strong hover:border-accent-emphasis hover:text-accent-emphasis'}`}>{EXERCISE_TYPE_LABELS[typeKey]}</button>))}
          {selectedExerciseType && (<button onClick={() => setSelectedExerciseType(null)} className="px-3 py-1.5 text-sm rounded-full border-2 border-strong bg-surface-alt text-muted hover:bg-active hover:border-strong flex items-center gap-1" title="Clear type filter"><XCircle size={14} /> Clear Type</button>)}
        </div>
      </div>

      {availableMuscles.length > 0 && (<div>
          <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Filter by muscle group:</p>
          <div className="flex flex-wrap gap-2">
            {availableMuscles.map(muscle => (<button key={muscle} onClick={() => handleMuscleClick(muscle)} className={`px-3.5 py-1.5 text-sm rounded-full border-2 transition-all duration-150 ease-in-out font-medium ${selectedMuscles.includes(muscle) ? 'bg-accent-emphasis text-on-accent border-accent-emphasis shadow-md hover:bg-accent-emphasis-hover' : 'bg-app text-default border-strong hover:border-accent-emphasis hover:text-accent-emphasis'}`}>{muscle}</button>))}
            {selectedMuscles.length > 0 && (<button onClick={() => setSelectedMuscles([])} className="px-3 py-1.5 text-sm rounded-full border-2 border-strong bg-surface-alt text-muted hover:bg-active hover:border-strong flex items-center gap-1" title="Clear all muscle filters"><XCircle size={14} /> Clear Muscles</button>)}
          </div>
      </div>)}

      {loading && <div className="flex justify-center py-8"><Loader2 size={36} className="animate-spin text-accent-emphasis" /></div>}
      
      {!loading && exercisesToDisplay.length > 0 && (<div className="max-h-[calc(90vh-380px)] sm:max-h-[calc(90vh-360px)] overflow-y-auto space-y-2 pr-1 -mr-1 mt-3">
          {exercisesToDisplay.map(exercise => (<button key={exercise.id || exercise.name} onClick={() => onExerciseSelect(exercise)} className="w-full text-left p-3.5 bg-app hover:bg-accent-subtle-bg border border-subtle rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-emphasis/50 focus:border-accent-emphasis">
              <p className="font-semibold text-default text-md">{exercise.name}</p>
              {exercise.muscles && typeof exercise.muscles === 'string' && (<p className="text-xs text-accent-emphasis font-medium mt-0.5">{exercise.muscles}</p>)}
              {exercise.type_ && <p className="text-xs text-muted mt-0.5">Type: {EXERCISE_TYPE_LABELS[exercise.type_] || exercise.type_}</p>}
          </button>))}
      </div>)}
      
      {!loading && exercisesToDisplay.length === 0 && ( noFiltersActive ? ( initialExerciseCount === 0 ? (<p className="text-center text-muted py-6">No exercises defined yet. Try creating one!</p>) : (<p className="text-center text-muted py-6">Search or apply filters to see results.</p>) ) : (<p className="text-center text-muted py-6">No exercises found matching your criteria.</p>) )}
    </div>
  );
};

export default ExerciseSelectionStep;
