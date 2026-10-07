import type { SVGProps } from 'react'

const iconPaths = [
  <g key="ai"><path d="M7 6 12 11 18 5M5 17l7-6 7 7M12 11v9"/><circle cx="7" cy="6" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="18" r="2"/><circle cx="12" cy="11" r="2.4"/><path d="M10 21h4"/></g>,
  <g key="embedded"><rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9" y="9" width="6" height="6" rx=".5"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/></g>,
  <g key="robotics"><path d="M4 21h15M7 21v-4l5-5-4-5 4-4 5 4-2 4 4 4m-2-1 3-1 1 3"/><circle cx="9" cy="17" r="2"/><circle cx="12" cy="10" r="2"/><path d="m10 5 4 3"/></g>,
  <g key="software"><path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16"/></g>,
  <g key="iot"><path d="M3 7a14 14 0 0 1 18 0M6 10a9 9 0 0 1 12 0m-9 3a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="17" r="2"/><path d="M12 19v3"/></g>,
  <g key="research"><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 11h3m-3 3h3m-3 4 3-2 3 1 2-4"/></g>,
  <g key="operations"><rect x="8" y="2" width="8" height="5" rx="1"/><rect x="2" y="17" width="7" height="5" rx="1"/><rect x="15" y="17" width="7" height="5" rx="1"/><path d="M12 7v5m-6.5 5v-5h13v5"/></g>,
]

export default function DivisionIcon({ index, ...props }: SVGProps<SVGSVGElement> & { index: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{iconPaths[index]}</svg>
}
