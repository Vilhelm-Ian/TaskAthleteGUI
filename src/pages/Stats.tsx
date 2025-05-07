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
      oneYearAgo.setDate(oneYearAgo.getDate() + 1);
      return { startDate: oneYearAgo.toISOString().split('T')[0], endDate };
    }
    case 'last_90d': {
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 89);
      return { startDate: ninetyDaysAgo.toISOString().split('T')[0], endDate };
    }
    case 'last_30d': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
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

    // X Axis
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

    // Y Axis
    chartRoot.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2~s")))
      .attr("font-family", "inherit")
      .call(g => g.select(".domain").attr("stroke", borderColorStrong))
      .call(g => g.selectAll(".tick line").attr("stroke", textColorSubtle))
      .call(g => g.selectAll(".tick text").attr("fill", textColorSubtle));

    const isBarChart = graphMetricType.includes('Volume') ||
                       graphMetricType.includes('Reps') ||
                       graphMetricType.includes('Duration') ||
                       graphMetricType.includes('Distance');

    if (isBarChart) {
      let barWidth = Math.max(1, (width / data.length) * 0.7); 
      barWidth = Math.min(barWidth, 50);

      chartRoot.selectAll(".bar")
        .data(data)
        .enter().append("rect")
          .attr("class", "bar")
          .attr("x", d => xScale(d.date) - barWidth / 2)
          .attr("y", d => yScale(d.value))
          .attr("width", barWidth)
          .attr("height", d => height - yScale(d.value))
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
    } else { 
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
    }
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

const Stats = () => {
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedGraphType, setSelectedGraphType] = useState<string>(graphTypeOptions[0].value);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>(timeFrameOptions[0].id);

  const [chartData, setChartData] = useState<ParsedChartDataPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const fetchedExercises: ExerciseDefinition[] = await invoke('list_exercises', {});
        setExercises(fetchedExercises);
        if (fetchedExercises.length > 0) {
          setSelectedExerciseId(fetchedExercises[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to fetch exercises:", err);
        setError("Failed to load exercises.");
      }
    };
    fetchExercises();
  }, []);

  useEffect(() => {
    if (!selectedExerciseId || !selectedGraphType) {
      setChartData(null);
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

    fetchChartData();
  }, [selectedExerciseId, selectedGraphType, selectedTimeFrame]);

  const MetricCard = ({ title, value, icon: Icon }: {title: string, value: string, icon: any}) => (
    <div class="bg-[var(--color-bg-surface)] p-4 rounded-md border border-[var(--color-border-subtle)] shadow-sm flex-shrink-0 w-full sm:w-auto sm:flex-grow">
        <div class="flex items-center justify-between mb-1">
            <h3 class="text-sm font-medium text-[var(--color-text-subtle)]">{title}</h3>
             {Icon && <Icon class="w-5 h-5 text-[var(--color-text-default)]" strokeWidth={2} />}
        </div>
        <p class="text-lg font-semibold text-[var(--color-text-default)]">{value}</p>
    </div>
  );

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
            disabled={exercises.length === 0}
          >
            {exercises.length === 0 && <option value="" class="text-[var(--color-text-muted)]">{isLoading ? "Loading..." : "No exercises found"}</option>}
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
            >
                {timeFrameOptions.map((tf) => (
                    <option class="bg-primary" key={tf.id} value={tf.id}>{tf.label}</option>
                ))}
            </select>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard title="Total Workouts" value="N/A" icon={ListChecks} />
          <MetricCard title="Avg Duration" value="N/A" icon={Timer} />
          <MetricCard title="Personal Best" value="N/A" icon={Target} />
      </div>

      {/* Chart Display Area */}
      <div class="flex-grow bg-[var(--color-bg-surface)] p-2 rounded-lg shadow-lg border border-[var(--color-border-subtle)] min-h-[350px] md:min-h-[450px] relative">
        {isLoading && (
          <div class="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-surface)]/75 z-10 rounded-lg">
            <p class="text-lg text-[var(--color-accent-emphasis)]">Loading chart data...</p>
          </div>
        )}
        {error && !isLoading && (
          <div class="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-accent-destructive)] p-4 rounded-lg">
            <p class="font-semibold">Error loading chart:</p>
            <p class="text-sm text-center">{error}</p>
          </div>
        )}
        {!isLoading && !error && chartData && (
             <D3ChartComponent
                data={chartData}
                graphMetricType={selectedGraphType}
                chartId={`exercise-chart-${selectedExerciseId}-${selectedGraphType}`}
            />
        )}
         {!isLoading && !error && (!chartData || chartData.length === 0) && (
            <div class="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
                <p>No data to display for the current selection.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Stats;
