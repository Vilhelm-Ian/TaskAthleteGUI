import { h } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, AlertTriangle, Search, XCircle, PlusCircle, Edit3, Trash2 } from 'lucide-preact';

const EXERCISE_TYPES = { BODYWEIGHT: 'BodyWeight', RESISTANCE: 'Resistance', CARDIO: 'Cardio' };
const EXERCISE_TYPE_LABELS = { [EXERCISE_TYPES.BODYWEIGHT]: 'Bodyweight', [EXERCISE_TYPES.RESISTANCE]: 'Resistance', [EXERCISE_TYPES.CARDIO]: 'Cardio' };

const ExerciseSelectionStep = ({ onExerciseSelect, onOpenCreateExerciseModal, onInitialDataLoaded, count, onEditExercise, onDeleteSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [exercisesToDisplay, setExercisesToDisplay] = useState([]);
  const [availableMuscles, setAvailableMuscles] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [selectedExerciseType, setSelectedExerciseType] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialExerciseCount, setInitialExerciseCount] = useState(0);

  // Long press & Context Menu state
  const [contextMenuExercise, setContextMenuExercise] = useState(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timerRef = useRef(null);

  const fetchInitialStep1Data = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [musclesData, allExercisesInitial] = await Promise.all([
        invoke('list_all_muscles'),
        invoke('list_exercises', { typeFilterStr: null, muscleFilter: null }) 
      ]);
      setAvailableMuscles(musclesData || []);
      const count = allExercisesInitial ? allExercisesInitial.length : 0;
      setInitialExerciseCount(count);
      
      if (count > 0 && !searchTerm && !selectedExerciseType && selectedMuscles.length === 0) {
        setExercisesToDisplay(allExercisesInitial || []);
      } else {
        setExercisesToDisplay([]); 
      }
      if (onInitialDataLoaded) onInitialDataLoaded(musclesData || []);

    } catch (err) {
      console.error("Step 1 data fetch error:", err);
      setError(typeof err === 'string' ? err : (err.message || "Failed to load exercise data."));
    } finally {
      setLoading(false);
    }
  }, [onInitialDataLoaded, count]); 

  const fetchExercisesOnFilterChange = useCallback(async () => {
    if (loading && initialExerciseCount === 0 && availableMuscles.length === 0) return;
    setLoading(true); setError(null);
    try {
      let fetched = await invoke('list_exercises', {
        typeFilterStr: selectedExerciseType,
        musclesFilter: selectedMuscles.length > 0 ? selectedMuscles : null,
      });
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        if (lowerSearchTerm) fetched = (fetched || []).filter(ex => ex.name.toLowerCase().includes(lowerSearchTerm));
      }
      setExercisesToDisplay(fetched || []);
    } catch (err) {
      console.error("Filter error:", err);
      setError("Failed to load filtered exercises.");
    } finally { setLoading(false); }
  }, [selectedExerciseType, selectedMuscles, searchTerm]); 

  useEffect(() => { fetchInitialStep1Data(); }, [fetchInitialStep1Data, count]);
  useEffect(() => { 
    const timeoutId = setTimeout(() => { fetchExercisesOnFilterChange(); }, searchTerm ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedMuscles, selectedExerciseType, fetchExercisesOnFilterChange]);


  // --- Long Press Logic ---
  const startPress = (exercise) => {
    setLongPressTriggered(false);
    timerRef.current = setTimeout(() => {
      setLongPressTriggered(true);
      setContextMenuExercise(exercise);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600); 
  };

  const endPress = (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (longPressTriggered && e) {
        e.preventDefault();
        e.stopPropagation();
    }
  };

  const handleClick = (exercise) => {
      if (longPressTriggered) return;
      onExerciseSelect(exercise);
  };

  // --- Context Menu Actions ---
  const handleEdit = () => {
      if (contextMenuExercise) {
          onEditExercise(contextMenuExercise);
          setContextMenuExercise(null);
      }
  };

  const handleDelete = async () => {
      if (!contextMenuExercise) return;
      if (confirm(`Delete "${contextMenuExercise.name}"? This cannot be undone.`)) {
          try {
              await invoke('delete_exercise', { identifiers: [contextMenuExercise.name] });
              setContextMenuExercise(null);
              if (onDeleteSuccess) onDeleteSuccess();
          } catch (e) {
              alert("Failed to delete: " + e);
          }
      }
  };

  return (
    <div className="space-y-4 sm:space-y-5 relative">
      {error && <div className="mb-4 bg-accent-destructive/10 border border-accent-destructive/30 p-3 rounded-lg text-accent-destructive text-sm"><AlertTriangle size={20} className="inline mr-2"/>{error}</div>}
      
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={20} className="text-muted" /></div>
          <input type="text" placeholder="Search exercises..." value={searchTerm} onInput={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-surface text-default border border-subtle rounded-lg focus:ring-2 focus:ring-accent-subtle-bg focus:border-accent-emphasis shadow-sm transition-shadow"/>
          {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-subtle"><XCircle size={18} /></button>)}
        </div>
        <button type="button" onClick={onOpenCreateExerciseModal} className="p-2.5 bg-accent-emphasis hover:bg-accent-emphasis-hover text-on-accent rounded-lg shadow-sm flex items-center justify-center"><PlusCircle size={20} /></button>
      </div>

      <div>
        <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Filter by type:</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(EXERCISE_TYPES).map(typeKey => (<button key={typeKey} onClick={() => setSelectedExerciseType(prev => (prev === typeKey ? null : typeKey))} className={`px-3.5 py-1.5 text-sm rounded-full border-2 transition-all font-medium ${selectedExerciseType === typeKey ? 'bg-accent-emphasis text-on-accent border-accent-emphasis shadow-md' : 'bg-app text-default border-strong hover:border-accent-emphasis'}`}>{EXERCISE_TYPE_LABELS[typeKey]}</button>))}
        </div>
      </div>

      {availableMuscles.length > 0 && (<div>
          <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Filter by muscle group:</p>
          <div className="flex flex-wrap gap-2">
            {availableMuscles.map(muscle => (<button key={muscle} onClick={() => setSelectedMuscles(prev => prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle])} className={`px-3.5 py-1.5 text-sm rounded-full border-2 transition-all font-medium ${selectedMuscles.includes(muscle) ? 'bg-accent-emphasis text-on-accent border-accent-emphasis shadow-md' : 'bg-app text-default border-strong hover:border-accent-emphasis'}`}>{muscle}</button>))}
          </div>
      </div>)}

      {loading && <div className="flex justify-center py-8"><Loader2 size={36} className="animate-spin text-accent-emphasis" /></div>}
      
      {!loading && exercisesToDisplay.length > 0 && (
          <div className="max-h-[calc(90vh-380px)] sm:max-h-[calc(90vh-360px)] overflow-y-auto space-y-2 pr-1 -mr-1 mt-3">
            {exercisesToDisplay.map(exercise => (
                <button 
                    key={exercise.id || exercise.name} 
                    onMouseDown={() => startPress(exercise)}
                    onTouchStart={() => startPress(exercise)}
                    onMouseUp={endPress}
                    onMouseLeave={endPress}
                    onTouchEnd={endPress}
                    onClick={() => handleClick(exercise)}
                    className="w-full text-left p-3.5 bg-app hover:bg-accent-subtle-bg border border-subtle rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent-emphasis/50 select-none"
                >
                    <p className="font-semibold text-default text-md">{exercise.name}</p>
                    {exercise.muscles && typeof exercise.muscles === 'string' && (<p className="text-xs text-accent-emphasis font-medium mt-0.5">{exercise.muscles}</p>)}
                </button>
            ))}
          </div>
      )}

      {/* Context Menu Overlay */}
      {contextMenuExercise && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-lg" onClick={() => setContextMenuExercise(null)}>
           <div className="bg-surface p-4 rounded-xl shadow-2xl border border-subtle w-4/5 max-w-sm animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-default mb-4 text-center">Manage "{contextMenuExercise.name}"</h3>
                <div className="flex flex-col gap-3">
                    <button onClick={handleEdit} className="flex items-center justify-center gap-2 p-3 bg-app hover:bg-hover border border-subtle rounded-lg text-default font-medium transition-colors">
                        <Edit3 size={18} /> Edit Exercise
                    </button>
                    <button onClick={handleDelete} className="flex items-center justify-center gap-2 p-3 bg-accent-destructive/10 hover:bg-accent-destructive/20 border border-accent-destructive/30 rounded-lg text-accent-destructive font-medium transition-colors">
                        <Trash2 size={18} /> Delete Exercise
                    </button>
                    <button onClick={() => setContextMenuExercise(null)} className="mt-2 text-sm text-muted hover:text-default underline">Cancel</button>
                </div>
           </div>
        </div>
      )}
      
      {!loading && exercisesToDisplay.length === 0 && ( <p className="text-center text-muted py-6">No exercises found.</p> )}
    </div>
  );
};

export default ExerciseSelectionStep;
