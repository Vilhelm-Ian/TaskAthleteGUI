import { h, Fragment } from 'preact';
import { CalendarIcon, PlusIcon } from './icons';

const WorkoutLoggerView = () => {
  return (
    <div class="min-h-screen bg-gray-50 py-10 px-4">
      <div class="max-w-xl mx-auto space-y-6">

        {/* Header Buttons */}
        <div class="flex justify-end space-x-3">
          <button class="flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition">
            <CalendarIcon class="w-5 h-5 mr-2" />
            <span class="text-sm font-medium">Calendar</span>
          </button>
          <button class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
            <PlusIcon class="w-5 h-5 mr-2" />
            <span class="text-sm font-medium">Add</span>
          </button>
        </div>

        {/* Date Navigation */}
        <div class="flex items-center justify-between bg-white rounded-lg shadow py-3 px-5 border">
          <button class="text-xl text-gray-500 hover:text-blue-600 transition">&larr;</button>
          <h2 class="text-base font-semibold text-gray-800">Sunday, May 4, 2025</h2>
          <button class="text-xl text-gray-500 hover:text-blue-600 transition">&rarr;</button>
        </div>

        {/* Workout Card */}
        <div class="bg-white p-6 max-w-md rounded-lg shadow border border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800 mb-4 text-center">Bench Press</h3>
          <div class="space-y-3">
            {[
              { reps: 10, weight: 135 },
              { reps: 8, weight: 155 },
              { reps: 6, weight: 175 }
            ].map((set, idx) => (
              <div
                key={idx}
                class="flex items-center px-4 py-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div class="flex-none w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-4">
                  {idx + 1}
                </div>
                <div class="flex justify-between w-full text-sm font-medium text-gray-700">
                  <span>{set.reps} reps</span>
                  <span>{set.weight} lbs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkoutLoggerView;

