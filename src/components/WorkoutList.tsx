// src/components/WorkoutList.tsx
import { FunctionalComponent } from 'preact';
import { Workout, WorkoutFiltersParams } from '../types';
import { useState } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';

interface WorkoutListProps {
    workouts: Workout[];
    exercises: { id: number; name: string }[]; // For filter dropdown
    onEdit: (workout: Workout) => void;
    onDelete: (id: number) => void;
    onAdd: () => void;
    onFilter: (filters: WorkoutFiltersParams) => void; // Function to trigger refetch with filters
    isLoading: boolean;
}

export const WorkoutList: FunctionalComponent<WorkoutListProps> = ({
    workouts,
    exercises,
    onEdit,
    onDelete,
    onAdd,
    onFilter,
    isLoading,
}) => {
    const [exerciseFilter, setExerciseFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD

    const handleFilter = () => {
        onFilter({
            exercise_name: exerciseFilter || undefined,
            date: dateFilter || undefined,
            // Add other filters if needed
        });
    };

    const formatDate = (isoDateTime: string) => {
        if (!isoDateTime) return 'N/A';
        try {
            return new Date(isoDateTime).toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <div class="p-4">
            <h2 class="text-2xl font-semibold mb-4">Workout Log</h2>

            {/* Filter Section */}
            <div class="mb-4 p-4 bg-white dark:bg-gray-800 rounded shadow flex flex-wrap gap-4 items-end">
                <div>
                    <label class="input-label" for="exercise-filter">Exercise</label>
                    <select
                        id="exercise-filter"
                        class="input-field"
                        value={exerciseFilter}
                        onChange={(e) => setExerciseFilter((e.target as HTMLSelectElement).value)}
                    >
                        <option value="">All Exercises</option>
                        {exercises.map((ex) => (
                            <option key={ex.id} value={ex.name}>{ex.name}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label class="input-label" for="date-filter">Date</label>
                    <input
                        id="date-filter"
                        type="date"
                        class="input-field"
                        value={dateFilter}
                        onChange={(e) => setDateFilter((e.target as HTMLInputElement).value)}
                    />
                </div>
                <button class="btn-secondary" onClick={handleFilter} disabled={isLoading}>
                    {isLoading ? 'Filtering...' : 'Apply Filters'}
                </button>
                <button class="btn-secondary" onClick={() => { setExerciseFilter(''); setDateFilter(''); onFilter({});}} disabled={isLoading}>
                    Clear Filters
                </button>
                 <button class="btn-primary ml-auto" onClick={onAdd}>
                    Add Workout
                </button>
            </div>

            {/* Workout Table */}
            {isLoading && !workouts.length ? (
                <p>Loading workouts...</p>
            ) : workouts.length === 0 ? (
                <p class="text-center text-gray-500 dark:text-gray-400">No workouts found matching the criteria.</p>
            ) : (
                <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Exercise</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            {workouts.map((w) => (
                                <tr key={w.id} class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">{formatDate(w.date)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{w.exercise_name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        {w.sets && w.reps ? `${w.sets}x${w.reps}` : ''}
                                        {w.weight ? ` @ ${w.weight} ${w.bodyweight ? '(BW: '+w.bodyweight+')' : ''}` : ''}
                                        {w.duration ? ` ${w.duration}s` : ''}
                                        {w.distance ? ` ${w.distance} units` : ''} {/* Add units from config later */}
                                    </td>
                                     <td class="px-6 py-4 text-sm max-w-xs truncate" title={w.notes ?? ''}>{w.notes ?? '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" onClick={() => onEdit(w)}>Edit</button>
                                        <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" onClick={() => onDelete(w.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
