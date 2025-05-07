import { h } from 'preact';
// Import Lucide icons
import { Search, SlidersHorizontal, Calendar, ChevronRight, List } from 'lucide-preact';
// import { WorkoutCard } from '../components/common/WorkoutCard'; // Defined below
// import { SearchFilterBar } from '../components/common/SearchFilterBar'; // Assumed separate

const History = () => {
  const workouts = [ /* ... */ ];

  return (
    <div class="flex flex-col sm:flex-row h-full gap-6">
       <div class="hidden sm:block sm:w-1/4 lg:w-1/5 flex-shrink-0">
        { /*<SearchFilterBar */}
       </div>

       <div class="flex-grow">
          <div class="flex justify-between items-center mb-4">
            <h1 class="text-xl font-semibold">Workout History</h1>
            <div class="flex gap-2">
               <button class="sm:hidden p-2 rounded-full hover:bg-gray-100 text-secondary" aria-label="Filters">
                   {/* Use Lucide SlidersHorizontal or Filter */}
                   <SlidersHorizontal size={20} strokeWidth={2} />
               </button>
               <button class="p-2 rounded-full hover:bg-gray-100 text-secondary" aria-label="Search">
                   {/* Use Lucide Search */}
                   <Search size={20} strokeWidth={2} />
               </button>
            </div>
          </div>

          <div class="mb-4 bg-bg-light p-2 rounded-md border border-gray-200">
              <p class="text-sm text-center text-secondary">
                  {/* Use Lucide Calendar */}
                  <Calendar class="inline mr-1" size={16} strokeWidth={2} /> Calendar Navigator Placeholder (Week/Month)
              </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {workouts.map(workout => (
              // Make sure WorkoutCard uses Lucide icons
              <WorkoutCard key={workout.id} {...workout} />
            ))}
            {/* ... (no workouts message) ... */}
          </div>
       </div>
    </div>
  );
};

// --- Updated Placeholder Sub-Component ---
const WorkoutCard = ({ date, type, duration, exercises }) => (
  <div class="bg-bg-light p-4 rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative">
      <span class="absolute top-2 left-2 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded">{date}</span>
      {/* Use Lucide List or other appropriate icon */}
      <span class="absolute top-2 right-2 text-secondary"><List size={18} strokeWidth={2} /></span>

      <div class="mt-8 grid grid-cols-2 gap-2">
          {/* ... (duration/exercise count) ... */}
      </div>
      {/* Use Lucide ChevronRight */}
      <ChevronRight class="absolute bottom-3 right-3 text-secondary" size={20} strokeWidth={2} />
  </div>
);

// SearchFilterBar likely doesn't need icons directly, but if it does, update it similarly.

export default History;
