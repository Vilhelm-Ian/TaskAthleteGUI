import { h } from 'preact';
import Tab from 'preact-material-components/Tab';
import TabBar from 'preact-material-components/TabBar';
import 'preact-material-components/TabBar/style.css';
// Import Lucide icons
import { BarChart2, LineChart, Target, Timer, ListChecks } from 'lucide-preact'; // Using BarChart2 and LineChart
// import { MetricCard } from '../components/common/MetricCard'; // Defined below

const Stats = () => {
  const timeframes = ['Week', 'Month', 'Year', 'All Time'];

  return (
    <div class="flex flex-col h-full">
      <h1 class="text-xl font-semibold mb-4">Progress</h1>

       {/* ... (Timeframe Tabs) ... */}

      <div class="mb-6 flex gap-4 overflow-x-auto pb-2 sm:overflow-visible">
          {/* Make sure MetricCard uses Lucide icons */}
          <MetricCard title="Total Workouts" value="72" icon={ListChecks} />
          <MetricCard title="Avg Duration" value="52 min" icon={Timer} />
          <MetricCard title="Bench Press PR" value="100 kg" icon={Target} />
      </div>

      <div class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1 Placeholder */}
          <div class="bg-bg-light p-4 rounded-md border border-gray-200 aspect-square flex flex-col">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Workouts per Month</h3>
              <div class="flex-grow bg-gray-100 rounded flex items-center justify-center">
                  {/* Use Lucide BarChart2 */}
                  <BarChart2 size={48} class="text-secondary opacity-50" strokeWidth={1.5} />
              </div>
              <p class="text-xs text-secondary mt-2 text-center">Chart showing workout frequency over time.</p>
          </div>

          {/* Chart 2 Placeholder */}
          <div class="bg-bg-light p-4 rounded-md border border-gray-200 aspect-square flex flex-col">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Weight Trend (Bench Press)</h3>
              <div class="flex-grow bg-gray-100 rounded flex items-center justify-center">
                  {/* Use Lucide LineChart */}
                  <LineChart size={48} class="text-secondary opacity-50" strokeWidth={1.5} />
              </div>
              <p class="text-xs text-secondary mt-2 text-center">Chart showing weight progression for a selected exercise.</p>
          </div>
      </div>
    </div>
  );
};

// --- Updated Placeholder Sub-Component ---
const MetricCard = ({ title, value, icon: Icon }) => (
    <div class="bg-bg-light p-4 rounded-md border border-gray-200 shadow-sm flex-shrink-0 w-40 sm:w-auto sm:flex-grow">
        <div class="flex items-center justify-between mb-1">
            <h3 class="text-sm font-medium text-secondary">{title}</h3>
             {/* Use Lucide icon */}
             {Icon && <Icon class="w-5 h-5 text-primary" strokeWidth={2} />}
        </div>
        <p class="text-lg font-semibold text-gray-900">{value}</p>
    </div>
);

export default Stats;
