import { h } from 'preact';


// Modified icon components with viewport preservation
const IconProps = ({ className = "w-6 h-6" }) => ({
  className,
  fill: "none",
  stroke: "currentColor",
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  // Adding preserveAspectRatio to prevent scaling issues
  preserveAspectRatio: "xMidYMid meet",
  // Adding explicit width and height in pixels instead of relying on classes only
  width: "24",
  height: "24",
  style: { 
    // Disable any browser-specific scaling
    transform: 'none',
    transition: 'none',
    // Force rendering as a block element
    display: 'block'
  }
});

export const CalendarIcon = ({ className = "w-6 h-6" }) => (
  <svg {...IconProps({ className })}>
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
    />
  </svg>
);

export const PlusIcon = ({ className = "w-6 h-6" }) => (
  <svg {...IconProps({ className })}>
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
      d="M12 4v16m8-8H4" 
    />
  </svg>
);


export const ChevronLeftIcon = ({ class: className = "w-6 h-6" }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    class={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="2" 
      d="M10 19l-7-7m0 0l7-7m-7 7h18" 
    />
  </svg>
);

export const ChevronRightIcon = ({ class: className = "w-6 h-6" }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    class={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="2" 
      d="M14 5l7 7m0 0l-7 7m7-7H3" 
    />
  </svg>
);

export const EditIcon = ({ class: className = "w-6 h-6" }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    class={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="2" 
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
    />
  </svg>
);

export const TrashIcon = ({ class: className = "w-6 h-6" }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    class={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="2" 
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
    />
  </svg>
);
