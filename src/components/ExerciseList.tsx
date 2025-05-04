// src/components/ExerciseList.tsx (Sketch)
import { FunctionalComponent } from 'preact';
import { ExerciseDefinition, ExerciseType } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface ExerciseListProps {
    exercises: ExerciseDefinition[];
    onAdd: () => void;
    onEdit: (exercise: ExerciseDefinition) => void;
    onDelete: (identifier: string) => void; // Use identifier (name or ID string)
    isLoading: boolean;
    // Add filters and onFilter prop if needed
}

export const ExerciseList: FunctionalComponent<ExerciseListProps> = ({
    exercises,
    onAdd,
    onEdit,
    onDelete,
    isLoading
}) => {
    // Similar structure to WorkoutList: Title, Add Button, Table
    return (
        <div class="p-4">
            <div class="flex justify-between items-center mb-4">
                 <h2 class="text-2xl font-semibold">Exercises</h2>
                 <button class="btn-primary" onClick={onAdd}>Add Exercise</button>
            </div>

            {isLoading && !exercises.length ? (
                <p>Loading exercises...</p>
            ) : exercises.length === 0 ? (
                 <p class="text-center text-gray-500 dark:text-gray-400">No exercises defined yet.</p>
             ) : (
                <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow">
                     <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        {/* Table Head: Name, Type, Muscles, Logging Flags, Actions */}
                        <thead class="bg-gray-50 dark:bg-gray-700">
                             <tr>
                                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Muscles</th>
                                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Logs</th>
                                 <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                             </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            {exercises.map((ex) => (
                                <tr key={ex.id} class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{ex.name} {ex.is_alias ? `(Alias -> ${ex.alias_target})`: ''}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">{ex.exercise_type}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">{ex.muscles ?? '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm space-x-1">
                                        {ex.log_weight && <span class="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">W</span>}
                                        {ex.log_reps && <span class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">R</span>}
                                        {ex.log_duration && <span class="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">T</span>}
                                        {ex.log_distance && <span class="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">D</span>}
                                    </td>
                                     <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" onClick={() => onEdit(ex)}>Edit</button>
                                        {/* Use name or ID as identifier */}
                                        <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" onClick={() => onDelete(ex.name)}>Delete</button>
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
