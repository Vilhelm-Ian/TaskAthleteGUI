import { h } from 'preact';
import Button from 'preact-material-components/Button';
import Fab from 'preact-material-components/Fab';
import 'preact-material-components/Button/style.css';
import 'preact-material-components/Fab/style.css';
import 'preact-material-components/TextField/style.css';
import 'preact-material-components/Select/style.css';
// Import Lucide icons
import { Calendar, Plus, Check, Move } from 'lucide-preact'; // Using Move for drag handle
// import { DateSelector } from '../components/common/DateSelector';
// import { PillSelector } from '../components/common/PillSelector';
// Note: ExerciseInputRow is defined below, update it too

const LogWorkout = () => {
  // ... (rest of component setup) ...
  const exercises = [/* ... */];

  return (
    <div class="flex flex-col h-full">
       <h1 class="text-xl font-semibold mb-4 sm:hidden">Log Workout</h1>

      {/* DateSelector needs Calendar icon if it uses one */}
      {/*  <DateSelector selectedDate="October 26, 2023" icon={Calendar} />  Pass icon if needed */}


      <div class="flex-grow mt-4 sm:flex sm:gap-6">
        <div class="sm:w-3/5 lg:w-2/3 space-y-4 relative">
           <div class="hidden sm:block absolute top-0 right-0 z-10">
               <Button raised class="bg-primary !text-white">
                   Save Workout
               </Button>
           </div>

          <h2 class="text-lg font-medium text-gray-800 pt-2 sm:pt-0">Exercises</h2>
          <div class="space-y-4">
            {exercises.map((ex, index) => (
              // Make sure ExerciseInputRow uses the Lucide Move icon
              <ExerciseInputRow key={ex.id} exerciseName={ex.name} index={index} />
            ))}
          </div>

          <button class="w-full flex items-center justify-center gap-2 py-2 px-4 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors">
            {/* Use Lucide Plus */}
            <Plus size={18} strokeWidth={2.5} /> Add Exercise
          </button>
        </div>

        <div class="hidden sm:block sm:w-2/5 lg:w-1/3 bg-bg-light p-4 rounded-md border border-gray-200 self-start">
          {/* ... (preview area) ... */}
        </div>
      </div>

      <Fab class="fixed bottom-20 right-4 sm:hidden bg-primary z-40 !text-white" aria-label="Save Workout">
         {/* Use Lucide Check */}
         <Check size={24} strokeWidth={3} />
      </Fab>
    </div>
  );
};

// --- Updated Placeholder Sub-Component ---
const ExerciseInputRow = ({ exerciseName, index }) => (
   <div class="bg-bg-light p-3 rounded-md border border-gray-200 flex flex-col xs:flex-row items-start xs:items-center gap-2">
      {/* Use Lucide Move icon for drag handle */}
      <button class="hidden sm:block text-secondary cursor-move mr-2" aria-label="Drag to reorder">
          <Move size={20} strokeWidth={2} />
      </button>
      <div class="flex-grow w-full xs:w-auto">
          {/* ... (select input) ... */}
      </div>
      <div class="w-full xs:w-auto grid grid-cols-3 gap-2 mt-2 xs:mt-0">
          {/* ... (number inputs) ... */}
      </div>
   </div>
);

export default LogWorkout;
