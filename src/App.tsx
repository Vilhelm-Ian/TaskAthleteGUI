// src/App.tsx
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { Workout, ExerciseDefinition, Config, WorkoutFiltersParams, AddWorkoutParams, EditWorkoutParams, CreateExerciseParams, EditExerciseParams } from './types';
import { NavBar, View } from './components/NavBar';
import { WorkoutList } from './components/WorkoutList';
import { WorkoutForm } from './components/WorkoutForm';
import { ExerciseList } from './components/ExerciseList'; // Import Exercise components

export default function App() {
    const [currentView, setCurrentView] = useState<View>('workouts');
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
    const [config, setConfig] = useState<Config | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for managing forms
    const [showWorkoutForm, setShowWorkoutForm] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
    const [showExerciseForm, setShowExerciseForm] = useState(false); // State for exercise form
    const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null); // State for editing exercise

    // --- Data Fetching ---

    const fetchConfig = useCallback(async () => {
        try {
            const fetchedConfig = await invoke<Config>('get_config');
            setConfig(fetchedConfig);
        } catch (err: any) {
            setError(`Failed to load config: ${err}`);
        }
    }, []);

    const fetchWorkouts = useCallback(async (filters: WorkoutFiltersParams = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            console.log("Fetching workouts with filters:", filters);
            const fetchedWorkouts = await invoke<Workout[]>('list_workouts', { filters });
            setWorkouts(fetchedWorkouts);
        } catch (err: any) {
             console.error("Error fetching workouts:", err);
            setError(`Failed to load workouts: ${err}`);
             setWorkouts([]); // Clear workouts on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchExercises = useCallback(async () => {
        // Don't set main loading indicator for exercises if workouts are primary view
        // setIsLoading(true);
        setError(null);
        try {
            const fetchedExercises = await invoke<ExerciseDefinition[]>('list_exercises', { typeFilterStr: null, muscleFilter: null }); // Add filters later if needed
            setExercises(fetchedExercises);
        } catch (err: any) {
             console.error("Error fetching exercises:", err);
            setError(`Failed to load exercises: ${err}`);
             setExercises([]); // Clear exercises on error
        } finally {
            // setIsLoading(false);
        }
    }, []);

    // Initial data load
    useEffect(() => {
        fetchConfig();
        fetchExercises(); // Fetch exercises early for forms
        fetchWorkouts(); // Fetch initial workouts
    }, [fetchConfig, fetchWorkouts, fetchExercises]);

     // Refetch workouts when the view changes back to workouts
     useEffect(() => {
         if (currentView === 'workouts' && !showWorkoutForm) {
             fetchWorkouts();
         }
          if (currentView === 'exercises' && !showExerciseForm) {
             fetchExercises();
         }
     }, [currentView, showWorkoutForm, showExerciseForm, fetchWorkouts, fetchExercises]);


    // --- Workout CRUD Handlers ---

    const handleAddWorkout = () => {
        setEditingWorkout(null);
        setShowWorkoutForm(true);
        // Optional: change view? Or show form as modal/overlay?
        // setCurrentView('addWorkout'); // Or manage via state like showWorkoutForm
    };

    const handleEditWorkout = (workout: Workout) => {
        setEditingWorkout(workout);
        setShowWorkoutForm(true);
    };

    const handleWorkoutFormCancel = () => {
        setShowWorkoutForm(false);
        setEditingWorkout(null);
    };

    const handleWorkoutFormSubmit = useCallback(async (data: AddWorkoutParams | EditWorkoutParams) => {
        setError(null);
        const command = editingWorkout ? 'edit_workout' : 'add_workout';
        const params = editingWorkout ? { params: data } : { params: data }; // Structure matches backend command signature

        try {
            await invoke(command, params);
            setShowWorkoutForm(false);
            setEditingWorkout(null);
            await fetchWorkouts(); // Refetch list after successful add/edit
            // Optionally show success message
        } catch (err: any) {
             console.error(`Error ${command}:`, err);
            // Let the form handle showing the error
            // setError(`Failed to ${editingWorkout ? 'update' : 'add'} workout: ${err}`);
            throw err; // Re-throw so form can catch it and set its own state
        }
    }, [editingWorkout, fetchWorkouts]);

    const handleDeleteWorkout = useCallback(async (id: number) => {
        if (!confirm(`Are you sure you want to delete workout #${id}?`)) return;
        setIsLoading(true);
        setError(null);
        try {
            await invoke('delete_workouts', { ids: [id] });
            await fetchWorkouts(); // Refetch list
        } catch (err: any) {
             console.error("Error deleting workout:", err);
            setError(`Failed to delete workout: ${err}`);
        } finally {
            setIsLoading(false);
        }
    }, [fetchWorkouts]);


     // --- Exercise CRUD Handlers (Similar Pattern) ---

     const handleAddExercise = () => {
        setEditingExercise(null);
        setShowExerciseForm(true);
     };

     const handleEditExercise = (exercise: ExerciseDefinition) => {
        setEditingExercise(exercise);
        setShowExerciseForm(true);
     };

     const handleExerciseFormCancel = () => {
        setShowExerciseForm(false);
        setEditingExercise(null);
     };

     const handleExerciseFormSubmit = useCallback(async (data: CreateExerciseParams | EditExerciseParams) => {
         // Implementation similar to handleWorkoutFormSubmit
         // Use 'create_exercise' or 'edit_exercise' invoke calls
         setError(null);
         const isEditing = 'identifier' in data; // Check if it's an EditExerciseParams object
         const command = isEditing ? 'edit_exercise' : 'create_exercise';
         // Adjust params based on whether it's create or edit, matching backend expectations
         const params = isEditing
            ? data // Edit params match expected structure more directly
            : { // Create params need keys matching backend args
                name: data.name,
                typeStr: data.type_str,
                muscles: data.muscles,
                logWeight: data.log_weight,
                logReps: data.log_reps,
                logDuration: data.log_duration,
                logDistance: data.log_distance
              };

          try {
            await invoke(command, params);
            setShowExerciseForm(false);
            setEditingExercise(null);
            await fetchExercises(); // Refetch list
             // Optionally refetch workouts if exercise name change affects filters/display
            // await fetchWorkouts();
         } catch (err: any) {
             console.error(`Error ${command}:`, err);
             throw err; // Re-throw for form's error handling
         }
     }, [fetchExercises]); // Add fetchWorkouts if needed

     const handleDeleteExercise = useCallback(async (identifier: string) => {
         // Implementation similar to handleDeleteWorkout
         // Use 'delete_exercise' invoke call with { identifiers: [identifier] }
          if (!confirm(`Are you sure you want to delete exercise "${identifier}"? This may also delete associated workouts if cascade is set up.`)) return;
         setIsLoading(true); // Maybe use a different loading indicator for exercises
         setError(null);
         try {
             await invoke('delete_exercise', { identifiers: [identifier] });
             await fetchExercises(); // Refetch list
             await fetchWorkouts(); // Refetch workouts as deleted exercise might have been logged
         } catch (err: any) {
              console.error("Error deleting exercise:", err);
             setError(`Failed to delete exercise: ${err}`);
         } finally {
             setIsLoading(false); // Reset appropriate indicator
         }
     }, [fetchExercises, fetchWorkouts]);


    // --- Render Logic ---

    const renderCurrentView = () => {
        if (showWorkoutForm) {
            return <WorkoutForm
                        exercises={exercises}
                        initialData={editingWorkout}
                        onSubmit={handleWorkoutFormSubmit}
                        onCancel={handleWorkoutFormCancel}
                    />;
        }
         if (showExerciseForm) {
             // Render ExerciseForm when implemented
             return <ExerciseForm // Need to create this component
                         initialData={editingExercise}
                         onSubmit={handleExerciseFormSubmit}
                         onCancel={handleExerciseFormCancel}
                      />;
         }

        switch (currentView) {
            case 'workouts':
                return <WorkoutList
                            workouts={workouts}
                            exercises={exercises} // Pass exercises for filter dropdown
                            onEdit={handleEditWorkout}
                            onDelete={handleDeleteWorkout}
                            onAdd={handleAddWorkout}
                            onFilter={fetchWorkouts} // Pass fetchWorkouts as the filter handler
                            isLoading={isLoading}
                        />;
            case 'exercises':
                 return <ExerciseList
                             exercises={exercises}
                             onAdd={handleAddExercise}
                             onEdit={handleEditExercise}
                             onDelete={handleDeleteExercise}
                             isLoading={isLoading} // Or a separate loading state for exercises
                         />;
            // case 'settings':
            //     return <Settings config={config} onSave={handleSaveConfig} ... /> // Create Settings component
            default:
                return <WorkoutList workouts={workouts} exercises={exercises} onEdit={handleEditWorkout} onDelete={handleDeleteWorkout} onAdd={handleAddWorkout} onFilter={fetchWorkouts} isLoading={isLoading} />;
        }
    };

    return (
        <div class="min-h-screen flex flex-col">
            <NavBar currentView={currentView} onNavigate={(view) => {
                // Close forms when navigating away
                setShowWorkoutForm(false);
                setShowExerciseForm(false);
                setEditingWorkout(null);
                setEditingExercise(null);
                setCurrentView(view)
            }} />
            <main class="flex-grow container mx-auto px-4 py-4">
                 {error && <div class="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded shadow">{error} <button onClick={() => setError(null)} class="float-right font-bold">X</button></div>}
                {renderCurrentView()}
            </main>
             <footer class="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
                Task Athlete Tracker
            </footer>
        </div>
    );
}

// Placeholder for ExerciseForm - implement similarly to WorkoutForm
const ExerciseForm: FunctionalComponent<any> = ({ onSubmit, onCancel, initialData }) => {
     // Basic structure - Needs state, inputs for name, type, muscles, checkboxes for logs
     const [name, setName] = useState(initialData?.name ?? '');
     const [type, setType] = useState<ExerciseType>(initialData?.exercise_type ?? 'Strength');
     // ... other state variables ...
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState<string|null>(null);


     const handleSubmit = async (e: Event) => {
        e.preventDefault();
         setIsLoading(true);
         setError(null);
         const dataToSend = initialData
            ? { // Edit Params
                identifier: initialData.name, // Or ID if you use that
                new_name: name,
                new_type_str: type,
                 // ... other fields
            } : { // Create Params
                name: name,
                type_str: type,
                 // ... other fields
            }
        try {
            await onSubmit(dataToSend);
        } catch(err: any) {
             setError(err.message || "Failed to save exercise");
        } finally {
            setIsLoading(false);
        }
     }

     return (
         <div class="p-6 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 class="text-2xl font-semibold mb-6 text-center">{initialData ? 'Edit Exercise' : 'Add New Exercise'}</h2>
              {error && <p class="mb-4 text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded">{error}</p>}

            <form onSubmit={handleSubmit} class="space-y-4">
                 {/* Form Inputs: Name (text), Type (select), Muscles (text), Log Flags (checkboxes) */}
                 <div>
                    <label class="input-label" for="ex-name">Name</label>
                    <input id="ex-name" type="text" value={name} onChange={e => setName((e.target as HTMLInputElement).value)} class="input-field" required disabled={isLoading}/>
                 </div>
                  <div>
                     <label class="input-label" for="ex-type">Type</label>
                     <select id="ex-type" value={type} onChange={e => setType((e.target as HTMLSelectElement).value as ExerciseType)} class="input-field" required disabled={isLoading}>
                         {/* Populate with ExerciseType options */}
                         <option value="Strength">Strength</option>
                         <option value="Cardio">Cardio</option>
                         <option value="Flexibility">Flexibility</option>
                         <option value="Other">Other</option>
                     </select>
                  </div>
                   {/* Add inputs for muscles, log flags */}

                 <div class="flex justify-end space-x-3 pt-4">
                     <button type="button" class="btn-secondary" onClick={onCancel} disabled={isLoading}>Cancel</button>
                     <button type="submit" class="btn-primary" disabled={isLoading}>
                         {isLoading ? 'Saving...' : (initialData ? 'Update Exercise' : 'Add Exercise')}
                     </button>
                 </div>
            </form>
        </div>
     );
};
