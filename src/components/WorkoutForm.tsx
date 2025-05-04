// src/components/WorkoutForm.tsx
import { FunctionalComponent } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { Workout, ExerciseDefinition, AddWorkoutParams, EditWorkoutParams, ExerciseType } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface WorkoutFormProps {
    exercises: ExerciseDefinition[];
    initialData?: Workout | null; // For editing
    onSubmit: (data: AddWorkoutParams | EditWorkoutParams) => Promise<void>; // Make async for loading state
    onCancel: () => void;
}

export const WorkoutForm: FunctionalComponent<WorkoutFormProps> = ({
    exercises,
    initialData,
    onSubmit,
    onCancel,
}) => {
    const [formData, setFormData] = useState<Partial<AddWorkoutParams & { id?: number; dateInput: string }>>({});
    const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper to format date for input type="datetime-local"
    const formatDateTimeLocal = (isoString?: string): string => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            // Adjust for timezone offset to display correctly in local time in the input
             const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
             const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            return localISOTime;
        } catch {
            return ''; // Handle invalid date string if necessary
        }
    };

     // Helper to get today's date formatted for input type="date"
     const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    useEffect(() => {
        if (initialData) {
            // Editing existing workout
            const exercise = exercises.find(ex => ex.name === initialData.exercise_name) ?? null; // Or match by ID if available and stable
             setSelectedExercise(exercise);
            setFormData({
                id: initialData.id,
                exercise_identifier: initialData.exercise_name, // Use name as identifier for simplicity here
                dateInput: formatDateTimeLocal(initialData.date), // Use helper for input
                sets: initialData.sets ?? undefined,
                reps: initialData.reps ?? undefined,
                weight: initialData.weight ?? undefined,
                duration: initialData.duration ?? undefined,
                distance: initialData.distance ?? undefined,
                notes: initialData.notes ?? undefined,
                bodyweight_to_use: initialData.bodyweight ?? undefined, // Assuming this maps to bodyweight_to_use on add/edit
                 // If editing, we likely don't need implicit types/muscles
            });
        } else {
             // Adding new workout - default date to now
             const now = new Date();
             setFormData({ dateInput: formatDateTimeLocal(now.toISOString()) });
             setSelectedExercise(null);
        }
    }, [initialData, exercises]);

    const handleInputChange = (e: Event) => {
        const { name, value, type } = e.target as HTMLInputElement;
         let processedValue: string | number | undefined = value;

         if (type === 'number' && value !== '') {
             processedValue = parseFloat(value);
             if (isNaN(processedValue)) {
                 processedValue = undefined; // Handle invalid number input
             }
         } else if (value === '') {
              processedValue = undefined; // Treat empty strings as undefined for optional fields
         }


        setFormData((prev) => ({ ...prev, [name]: processedValue }));
    };

    const handleExerciseChange = (e: Event) => {
        const exId = (e.target as HTMLSelectElement).value;
        const exercise = exercises.find(ex => ex.id.toString() === exId) ?? null;
        setSelectedExercise(exercise);
        setFormData(prev => ({ ...prev, exercise_identifier: exercise?.name })); // Use name for now
    };

     // Handle date change for datetime-local input
     const handleDateTimeChange = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setFormData((prev) => ({ ...prev, dateInput: value }));
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError(null);

        if (!formData.exercise_identifier) {
            setError("Please select an exercise.");
            return;
        }

         // Convert local datetime input back to ISO string (UTC) for backend
         let isoDateString: string | undefined = undefined;
         if (formData.dateInput) {
            try {
                // Input value is local time, convert to Date object, then to UTC ISO string
                isoDateString = new Date(formData.dateInput).toISOString();
            } catch {
                 setError("Invalid date/time format.");
                 return;
            }
         }


        const dataToSend: AddWorkoutParams | EditWorkoutParams = initialData
            ? { // Edit Params (match EditWorkoutCmdParams, EditWorkoutParams TS type)
                id: formData.id!,
                new_exercise_identifier: formData.exercise_identifier,
                new_sets: formData.sets,
                new_reps: formData.reps,
                new_weight: formData.weight,
                // new_bodyweight: ??? // How to edit this? Add form field if needed
                new_duration: formData.duration,
                new_distance_arg: formData.distance, // Note name difference
                new_notes: formData.notes,
                new_date: isoDateString ? new Date(isoDateString).toISOString().split('T')[0] : undefined, // Requires YYYY-MM-DD for edit
            }
            : { // Add Params (match AddWorkoutCmdParams, AddWorkoutParams TS type)
                exercise_identifier: formData.exercise_identifier!,
                date: isoDateString, // Send UTC ISO string
                sets: formData.sets,
                reps: formData.reps,
                weight: formData.weight,
                duration: formData.duration,
                distance: formData.distance,
                notes: formData.notes,
                // implicit_type/muscles only needed if exercise doesn't exist? Backend handles this.
                bodyweight_to_use: formData.bodyweight_to_use, // Optional field
            };

        setIsLoading(true);
        try {
            await onSubmit(dataToSend);
        } catch (err: any) {
             setError(err?.message || 'Failed to save workout.');
        } finally {
            setIsLoading(false);
        }
    };

    // Determine which fields to show based on selected exercise
    const showWeight = selectedExercise?.log_weight ?? true; // Default to true if no exercise selected yet
    const showReps = selectedExercise?.log_reps ?? true;
    const showSets = selectedExercise?.log_reps ?? true; // Often linked to reps
    const showDuration = selectedExercise?.log_duration ?? false;
    const showDistance = selectedExercise?.log_distance ?? false;

    return (
        <div class="p-6 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 class="text-2xl font-semibold mb-6 text-center">
                {initialData ? 'Edit Workout' : 'Add New Workout'}
            </h2>
            {error && <p class="mb-4 text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded">{error}</p>}
            <form onSubmit={handleSubmit} class="space-y-4">
                <div>
                    <label for="exercise_identifier" class="input-label">Exercise</label>
                    <select
                        id="exercise_identifier"
                        name="exercise_identifier"
                        class="input-field"
                        value={selectedExercise?.id ?? ''}
                        onChange={handleExerciseChange}
                        required
                        disabled={isLoading}
                    >
                        <option value="" disabled>Select an exercise</option>
                        {exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </select>
                </div>

                 <div>
                    <label for="date" class="input-label">Date & Time</label>
                    <input
                        id="date"
                        name="dateInput" // Use separate state for input value
                        type="datetime-local"
                        class="input-field"
                        value={formData.dateInput}
                        onChange={handleDateTimeChange}
                        required
                        disabled={isLoading}
                    />
                </div>

                {/* Conditionally Render Fields based on Exercise Type */}
                <div class="grid grid-cols-2 gap-4">
                    {showSets && (
                         <div>
                            <label for="sets" class="input-label">Sets</label>
                            <input id="sets" name="sets" type="number" min="0" step="1" class="input-field" value={formData.sets ?? ''} onChange={handleInputChange} disabled={isLoading} />
                         </div>
                     )}
                     {showReps && (
                         <div>
                            <label for="reps" class="input-label">Reps</label>
                            <input id="reps" name="reps" type="number" min="0" step="1" class="input-field" value={formData.reps ?? ''} onChange={handleInputChange} disabled={isLoading} />
                         </div>
                     )}
                     {showWeight && (
                         <div>
                            <label for="weight" class="input-label">Weight</label>
                            <input id="weight" name="weight" type="number" min="0" step="any" class="input-field" value={formData.weight ?? ''} onChange={handleInputChange} disabled={isLoading} />
                         </div>
                     )}
                      {showDuration && (
                         <div>
                            <label for="duration" class="input-label">Duration (s)</label>
                            <input id="duration" name="duration" type="number" min="0" step="1" class="input-field" value={formData.duration ?? ''} onChange={handleInputChange} disabled={isLoading} />
                         </div>
                     )}
                      {showDistance && (
                         <div>
                            <label for="distance" class="input-label">Distance</label>
                            <input id="distance" name="distance" type="number" min="0" step="any" class="input-field" value={formData.distance ?? ''} onChange={handleInputChange} disabled={isLoading} />
                         </div>
                     )}
                     <div>
                        <label for="bodyweight_to_use" class="input-label">Bodyweight Used (Optional)</label>
                        <input id="bodyweight_to_use" name="bodyweight_to_use" type="number" min="0" step="any" class="input-field" value={formData.bodyweight_to_use ?? ''} onChange={handleInputChange} disabled={isLoading} />
                     </div>
                </div>

                <div>
                    <label for="notes" class="input-label">Notes</label>
                    <textarea id="notes" name="notes" rows={3} class="input-field" value={formData.notes ?? ''} onChange={handleInputChange} disabled={isLoading}></textarea>
                </div>

                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" class="btn-secondary" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Saving...' : (initialData ? 'Update Workout' : 'Add Workout')}
                    </button>
                </div>
            </form>
        </div>
    );
};
