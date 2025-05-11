// src/components/Stats/Stats.tsx (or your actual path)
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import * as d3 from 'd3';
import { ListChecks, Target, Timer } from 'lucide-preact';

// Define types based on your Rust structs (ensure they are accurate)
interface ExerciseDefinition {
  id: number;
  name: string;
  type: string;
  muscles: string | null;
  log_weight: boolean;
  log_reps: boolean;
  log_duration: boolean;
  log_distance: boolean;
}

type ChartDataPointFromBackend = [string, number]; // [YYYY-MM-DD, value]
type ParsedChartDataPoint = { date: Date; value: number };

// --- New Types for Exercise Stats ---
interface PersonalBestsStats {
  max_weight: number | null;
  max_reps: number | null;
  max_duration_minutes: number | null;
  max_distance_km: number | null; // Backend sends km
}

interface ExerciseStatsData {
  canonical_name: string;
  total_workouts: number;
  first_workout_date: string | null; // YYYY-MM-DD
  last_workout_date: string | null; // YYYY-MM-DD
  avg_workouts_per_week: number | null;
  longest_gap_days: number | null;
  personal_bests: PersonalBestsStats;
  current_streak: number;
  longest_streak: number;
  streak_interval_days: number;
}

interface AppConfig {
    units: 'metric' | 'imperial';
    // Add other config fields if needed for display
}
// --- End New Types ---


const graphTypeOptions = [
  { value: 'Estimated1RM', label: 'Est. 1 Rep Max' },
  { value: 'MaxWeight', label: 'Max Weight Lifted' },
  { value: 'MaxReps', label: 'Max Reps (at any weight)' },
  { value: 'WorkoutVolume', label: 'Total Volume' },
  { value: 'WorkoutReps', label: 'Total Reps' },
  { value: 'WorkoutDuration', label: 'Total Duration (min)' },
  { value: 'WorkoutDistance', label: 'Total Distance' },
];

const timeFrameOptions = [
  { id: 'all', label: 'All Time' },
  { id: 'ytd', label: 'Year to Date' },
  { id: 'last_year', label: 'Last 12 Months' },
  { id: 'last_90d', label: 'Last 90 Days' },
  { id: 'last_30d', label: 'Last 30 Days' },
];

const getTimeFrameDates = (timeFrameId: string): { startDate?: string; endDate?: string } => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  switch (timeFrameId) {
    case 'ytd':
      return { startDate: `${today.getFullYear()}-01-01`, endDate };
    case 'last_year': {
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      oneYearAgo.setDate(oneYearAgo.getDate() + 1); // Correctly make it exactly 12 months
      return { startDate: oneYearAgo.toISOString().split('T')[0], endDate };
    }
    case 'last_90d': {
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 89); // today - 89 days = 90 distinct days including today
      return { startDate: ninetyDaysAgo.toISOString().split('T')[0], endDate };
    }
    case 'last_30d': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29); // today - 29 days = 30 distinct days including today
      return { startDate: thirtyDaysAgo.toISOString().split('T')[0], endDate };
    }
    case 'all':
    default:
      return { startDate: undefined, endDate: undefined };
  }
};

interface D3ChartProps {
  data: ParsedChartDataPoint[];
  graphMetricType: string;
  chartId: string;
}

const D3ChartComponent = ({ data, graphMetricType, chartId }: D3ChartProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !tooltipRef.current) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll("*").remove();

    const parentElement = svgRef.current.parentElement;
    if (!parentElement) return;

    const parentWidth = parentElement.clientWidth;
    const parentHeight = parentElement.clientHeight;

    const styles = getComputedStyle(document.documentElement);
    const textColorMuted = styles.getPropertyValue('--color-text-muted').trim() || '#9ca3af';
    const textColorSubtle = styles.getPropertyValue('--color-text-subtle').trim() || '#6b7280';
    const borderColorStrong = styles.getPropertyValue('--color-border-strong').trim() || '#d1d5db';
    const accentColor = styles.getPropertyValue('--color-accent-emphasis').trim() || 'steelblue';


    if (data.length === 0) {
      svg.attr('width', parentWidth).attr('height', parentHeight);
      svg.append("text")
        .attr("x", parentWidth / 2)
        .attr("y", parentHeight / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "16px")
        .style("font-family", "inherit")
        .style("fill", textColorMuted)
        .text("No data available for this selection.");
      return;
    }

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = parentWidth - margin.left - margin.right;
    const height = parentHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const chartRoot = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, (d3.max(data, d => d.value) as number) * 1.1])
      .nice()
      .range([height, 0]);

    chartRoot.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(data.length, 5)).tickFormat(d3.timeFormat("%b %d '%y")))
      .attr("font-family", "inherit")
      .call(g => g.select(".domain").attr("stroke", borderColorStrong))
      .call(g => g.selectAll(".tick line").attr("stroke", textColorSubtle))
      .call(g => g.selectAll(".tick text").attr("fill", textColorSubtle)
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-40)"));

    chartRoot.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2~s")))
      .attr("font-family", "inherit")
      .call(g => g.select(".domain").attr("stroke", borderColorStrong))
      .call(g => g.selectAll(".tick line").attr("stroke", textColorSubtle))
      .call(g => g.selectAll(".tick text").attr("fill", textColorSubtle));

    const line = d3.line<ParsedChartDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    chartRoot.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", accentColor)
      .attr("stroke-width", 2)
      .attr("d", line);

    chartRoot.selectAll(".dot")
      .data(data)
      .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.date))
        .attr("cy", d => yScale(d.value))
        .attr("r", 4)
        .attr("fill", accentColor)
        .on("mouseover", (event, d_event) => {
          tooltip.style("opacity", 0.9)
                 .html(`Date: ${d3.timeFormat("%Y-%m-%d")(d_event.date)}<br/>Value: ${d_event.value.toFixed(2)}`)
                 .style("left", (event.pageX + 15) + "px")
                 .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });

  }, [data, graphMetricType, chartId]);

  return (
    <div class="w-full h-full relative">
      <svg ref={svgRef} class="block w-full h-full"></svg>
      <div
        ref={tooltipRef}
        class="absolute text-center p-2 text-xs bg-[var(--color-text-default)] text-[var(--color-bg-app)] rounded pointer-events-none opacity-0 transition-opacity duration-200"
        id={`tooltip-${chartId}`}
      ></div>
    </div>
  );
};

// --- Helper function for formatting stat values ---
const formatStatValue = (
  value: number | string | null | undefined,
  unitSingular: string = '',
  unitPlural?: string, // Optional: if not provided, unitSingular is used for all numbers
  precision: number = 0
): string => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    const numStr = value.toFixed(precision);
    if (unitSingular) {
      const actualUnit = (value === 1 || value === -1) ? unitSingular : (unitPlural || unitSingular);
      return `${numStr} ${actualUnit}`;
    }
    return numStr;
  }
  return value; // For strings like dates
};


// --- New UI Components for Stats Tables ---
const ExerciseSummaryTable = ({ stats, exerciseName }: { stats: ExerciseStatsData, exerciseName: string }) => {
  const data = [
    { label: 'Total Workouts', value: formatStatValue(stats.total_workouts) },
    { label: 'First Workout', value: formatStatValue(stats.first_workout_date) },
    { label: 'Last Workout', value: formatStatValue(stats.last_workout_date) },
    { label: 'Avg Workouts / Week', value: formatStatValue(stats.avg_workouts_per_week, '', '', 2) }, // No units, precision 2
    { label: 'Longest Gap', value: formatStatValue(stats.longest_gap_days, 'day', 'days') },
    { label: 'Current Streak', value: `${formatStatValue(stats.current_streak)} (Interval: ${stats.streak_interval_days} days)` },
    { label: 'Longest Streak', value: `${formatStatValue(stats.longest_streak)} (Interval: ${stats.streak_interval_days} days)` },
  ];

  return (
    <div class="bg-[var(--color-bg-surface)] p-4 rounded-lg shadow border border-[var(--color-border-subtle)]">
      <h3 class="text-lg font-semibold mb-3 text-[var(--color-text-default)]">Statistics for '{exerciseName}'</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-[var(--color-text-subtle)]">
          <tbody class="divide-y divide-[var(--color-border-subtle)]">
            {data.map(item => (
              <tr key={item.label}>
                <th scope="row" class="py-2 pr-3 font-medium text-[var(--color-text-default)] whitespace-nowrap">{item.label}</th>
                <td class="py-2 pl-3 text-right whitespace-nowrap">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PersonalBestsTable = ({ pbs, exerciseDef, config }: { pbs: PersonalBestsStats, exerciseDef: ExerciseDefinition, config: AppConfig | null }) => {
  const KM_TO_MILE = 0.621371;
  const KG_TO_LBS = 2.20462;

  const displayUnits = config?.units || 'metric';
  const distanceUnitLabel = displayUnits === 'imperial' ? 'mi' : 'km';
  const weightUnitLabel = displayUnits === 'imperial' ? 'lbs' : 'kg';

  const data = [];

  if (exerciseDef.log_weight && pbs.max_weight !== null) {
    let displayWeight = pbs.max_weight;
    if (displayUnits === 'imperial') {
        displayWeight = pbs.max_weight * KG_TO_LBS;
    }
    data.push({ label: 'Max Weight', value: formatStatValue(displayWeight, weightUnitLabel, weightUnitLabel, 2) });
  }
  if (exerciseDef.log_reps && pbs.max_reps !== null) {
    data.push({ label: 'Max Reps', value: formatStatValue(pbs.max_reps) });
  }
  if (exerciseDef.log_duration && pbs.max_duration_minutes !== null) {
    data.push({ label: 'Max Duration', value: formatStatValue(pbs.max_duration_minutes, 'min', 'mins') });
  }
  if (exerciseDef.log_distance && pbs.max_distance_km !== null) {
    let displayDistance = pbs.max_distance_km;
    if (displayUnits === 'imperial') {
        displayDistance = pbs.max_distance_km * KM_TO_MILE;
    }
    data.push({ label: 'Max Distance', value: formatStatValue(displayDistance, distanceUnitLabel, distanceUnitLabel, 2) });
  }

  if (data.length === 0) {
    return (
      <div class="bg-[var(--color-bg-surface)] p-4 rounded-lg shadow border border-[var(--color-border-subtle)]">
        <h3 class="text-lg font-semibold mb-2 text-[var(--color-text-default)]">Personal Bests</h3>
        <p class="text-sm text-[var(--color-text-muted)]">No personal bests applicable or recorded for this exercise.</p>
      </div>
    );
  }

  return (
    <div class="bg-[var(--color-bg-surface)] p-4 rounded-lg shadow border border-[var(--color-border-subtle)]">
      <h3 class="text-lg font-semibold mb-3 text-[var(--color-text-default)]">Personal Bests</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-[var(--color-text-subtle)]">
          <tbody class="divide-y divide-[var(--color-border-subtle)]">
            {data.map(item => (
              <tr key={item.label}>
                <th scope="row" class="py-2 pr-3 font-medium text-[var(--color-text-default)] whitespace-nowrap">{item.label}</th>
                <td class="py-2 pl-3 text-right whitespace-nowrap">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
// --- End New UI Components ---


const Stats = () => {
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedGraphType, setSelectedGraphType] = useState<string>(graphTypeOptions[0].value);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>(timeFrameOptions[0].id);

  const [chartData, setChartData] = useState<ParsedChartDataPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- State for Exercise Stats ---
  const [exerciseStats, setExerciseStats] = useState<ExerciseStatsData | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  // --- End State for Exercise Stats ---

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true); // Combined loading for exercises and initial chart
      try {
        // Fetch exercises
        const fetchedExercises: ExerciseDefinition[] = await invoke('list_exercises', {});
        setExercises(fetchedExercises);
        if (fetchedExercises.length > 0) {
          // Automatically select the first exercise
          const firstExId = fetchedExercises[0].id.toString();
          setSelectedExerciseId(firstExId);
        } else {
          setIsLoading(false); // No exercises, stop loading
        }

        // Fetch app config
        const config: AppConfig = await invoke('get_config');
        setAppConfig(config);

      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("Failed to load initial page data.");
        setIsLoading(false);
      }
      // setIsLoading(false) will be handled by chart data fetch if exercises exist
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedExerciseId) {
      setChartData(null);
      setExerciseStats(null); // Clear stats if no exercise selected
      return;
    }

    const fetchChartData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { startDate, endDate } = getTimeFrameDates(selectedTimeFrame);
        const graphPayloadData = {
          identifier: selectedExerciseId,
          graphTypeStr: selectedGraphType,
          startDate: startDate,
          endDate: endDate,
        };
        const invokeArgs = { payload: graphPayloadData };
        const rawData: ChartDataPointFromBackend[] = await invoke('get_data_for_graph', invokeArgs);
        const parsedData: ParsedChartDataPoint[] = rawData
          .map(d => {
            const dateObj = d3.timeParse("%Y-%m-%d")(d[0]);
            return dateObj ? { date: dateObj, value: d[1] } : null;
          })
          .filter(d => d !== null) as ParsedChartDataPoint[];
        parsedData.sort((a, b) => a.date.getTime() - b.date.getTime());
        setChartData(parsedData);
      } catch (err: any) {
        console.error("Failed to fetch chart data:", err);
        setError(err.message || err.toString() || "Failed to load chart data.");
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchExerciseStats = async () => {
        setIsStatsLoading(true);
        setStatsError(null);
        try {
            const stats: ExerciseStatsData = await invoke('get_exercise_stats', { identifier: selectedExerciseId });
            setExerciseStats(stats);
        } catch (err: any) {
            console.error("Failed to fetch exercise stats:", err);
            setStatsError(err.message || err.toString() || "Failed to load exercise statistics.");
            setExerciseStats(null);
        } finally {
            setIsStatsLoading(false);
        }
    };

    if (selectedGraphType) fetchChartData(); // Fetch chart data if graph type is also selected
    fetchExerciseStats(); // Always fetch stats for the selected exercise

  }, [selectedExerciseId, selectedGraphType, selectedTimeFrame]);

  const MetricCard = ({ title, value, icon: Icon }: {title: string, value: string | JSX.Element, icon: any}) => (
    <div class="bg-[var(--color-bg-surface)] p-4 rounded-md border border-[var(--color-border-subtle)] shadow-sm flex-shrink-0 w-full sm:w-auto sm:flex-grow">
        <div class="flex items-center justify-between mb-1">
            <h3 class="text-sm font-medium text-[var(--color-text-subtle)]">{title}</h3>
             {Icon && <Icon class="w-5 h-5 text-[var(--color-text-default)]" strokeWidth={2} />}
        </div>
        <p class="text-lg font-semibold text-[var(--color-text-default)]">{value}</p>
    </div>
  );

  const selectedExerciseDefinition = exercises.find(ex => ex.id.toString() === selectedExerciseId);

  return (
    <div class="flex flex-col h-full p-4 space-y-6 bg-[var(--color-bg-app)] text-[var(--color-text-default)]">
      {/* Chart Controls */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-4 bg-[var(--color-bg-surface)] rounded-lg shadow">
        <div>
          <label htmlFor="exercise-select" class="block text-sm font-medium text-[var(--color-text-default)] mb-1">Exercise</label>
          <select
            id="exercise-select"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-[var(--color-bg-surface)] text-[var(--color-text-default)] border border-[var(--color-border-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-subtle-bg)] focus:border-[var(--color-accent-emphasis)] sm:text-sm rounded-md shadow-sm"
            value={selectedExerciseId || ''}
            onChange={(e) => setSelectedExerciseId((e.target as HTMLSelectElement).value)}
            disabled={exercises.length === 0 && isLoading} // Disable only if loading and no exercises yet
          >
            {exercises.length === 0 && <option value="" disabled class="text-[var(--color-text-muted)]">{isLoading ? "Loading exercises..." : "No exercises found"}</option>}
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id.toString()}>{ex.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="graph-type-select" class="block text-sm font-medium text-[var(--color-text-default)] mb-1">Metric to Display</label>
          <select
            id="graph-type-select"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-[var(--color-bg-surface)] text-[var(--color-text-default)] border border-[var(--color-border-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-subtle-bg)] focus:border-[var(--color-accent-emphasis)] sm:text-sm rounded-md shadow-sm"
            value={selectedGraphType}
            onChange={(e) => setSelectedGraphType((e.target as HTMLSelectElement).value)}
            disabled={!selectedExerciseId}
          >
            {graphTypeOptions.map((gt) => (
              <option key={gt.value} value={gt.value}>{gt.label}</option>
            ))}
          </select>
        </div>

        <div>
            <label htmlFor="timeframe-select" class="block text-sm font-medium text-[var(--color-text-default)] mb-1">Time Frame</label>
            <select
                id="timeframe-select"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-[var(--color-bg-surface)] text-[var(--color-text-default)] border border-[var(--color-border-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-subtle-bg)] focus:border-[var(--color-accent-emphasis)] sm:text-sm rounded-md shadow-sm"
                value={selectedTimeFrame}
                onChange={(e) => setSelectedTimeFrame((e.target as HTMLSelectElement).value)}
                disabled={!selectedExerciseId}
            >
                {timeFrameOptions.map((tf) => (
                    <option key={tf.id} value={tf.id}>{tf.label}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Chart Display Area */}
      <div class="flex-grow bg-[var(--color-bg-surface)] p-2 rounded-lg shadow-lg border border-[var(--color-border-subtle)] min-h-[350px] md:min-h-[450px] relative">
        {isLoading && selectedExerciseId && ( // Show loading only if an exercise is selected and chart data is loading
          <div class="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-surface)]/75 z-10 rounded-lg">
            <p class="text-lg text-[var(--color-accent-emphasis)]">Loading chart data...</p>
          </div>
        )}
        {error && !isLoading && selectedExerciseId && (
          <div class="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-accent-destructive)] p-4 rounded-lg">
            <p class="font-semibold">Error loading chart:</p>
            <p class="text-sm text-center">{error}</p>
          </div>
        )}
        {!isLoading && !error && chartData && selectedExerciseId && chartData.length > 0 && ( // Ensure chartData is not null and has items
             <D3ChartComponent
                data={chartData}
                graphMetricType={selectedGraphType}
                chartId={`exercise-chart-${selectedExerciseId}-${selectedGraphType}`}
            />
        )}
         {/* Show "No data to display" only if not loading, no error, but chartData is empty or null for a selected exercise */}
         {!isLoading && !error && selectedExerciseId && (!chartData || chartData.length === 0) && (
            <div class="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
                <p>No data to display for the current chart selection.</p>
            </div>
        )}
        {!selectedExerciseId && !isLoading && ( // If no exercise is selected and not in initial load
            <div class="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
                <p>Select an exercise to view stats and chart.</p>
            </div>
        )}
      </div>

      {/* --- Exercise Statistics and Personal Bests Section --- */}
      {selectedExerciseId && ( // Only show this section if an exercise is selected
        <div class="mt-0"> {/* Adjusted margin if needed, space-y-6 on parent handles overall spacing */}
          {isStatsLoading && (
            <div class="py-4 text-center text-[var(--color-text-muted)]">Loading statistics...</div>
          )}
          {statsError && !isStatsLoading && (
            <div class="p-4 bg-[var(--color-bg-destructive-subtle)] border border-[var(--color-border-destructive)] text-[var(--color-text-destructive)] rounded-md">
              <p class="font-semibold">Error loading exercise statistics:</p>
              <p class="text-sm">{statsError}</p>
            </div>
          )}
          {!isStatsLoading && !statsError && exerciseStats && selectedExerciseDefinition && appConfig && (
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExerciseSummaryTable stats={exerciseStats} exerciseName={exerciseStats.canonical_name} />
              <PersonalBestsTable pbs={exerciseStats.personal_bests} exerciseDef={selectedExerciseDefinition} config={appConfig} />
            </div>
          )}
          {/* Case: No stats found for a selected exercise (e.g., new exercise with no workouts) */}
          {!isStatsLoading && !statsError && !exerciseStats && selectedExerciseId && (
            <div class="py-4 text-center text-[var(--color-text-muted)]">
                No statistics recorded for '{selectedExerciseDefinition?.name || 'this exercise'}'.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Stats;
