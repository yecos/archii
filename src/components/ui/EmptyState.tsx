'use client';

import React from 'react';

/* ────────────────────────────────────────────────────────────────────
   EmptyState — Premium SVG empty-state illustrations for ArchiFlow
   Design: minimal line-art · bronze-gold palette · subtle float animation
   ──────────────────────────────────────────────────────────────────── */

interface EmptyStateProps {
  illustration: 'projects' | 'tasks' | 'search' | 'chat' | 'gallery' | 'calendar' | 'files' | 'team' | 'generic';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  className?: string;
}

// ── Shared SVG props ───────────────────────────────────────────────
const svgBase = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 160 160',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
});

const strokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ── Subtle fill helper ─────────────────────────────────────────────
const SUBTLE_FILL = 'currentColor';
const SUBTLE_FILL_OPACITY = 0.06;

// ════════════════════════════════════════════════════════════════════
// ILLUSTRATIONS
// ════════════════════════════════════════════════════════════════════

function ProjectsIllustration() {
  return (
    <g>
      {/* Blueprint / plan sheet */}
      <rect x="28" y="32" width="80" height="96" rx="4" {...strokeProps} />
      <rect x="36" y="40" width="64" height="80" rx="2" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
      {/* Grid lines */}
      <line x1="52" y1="40" x2="52" y2="120" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="68" y1="40" x2="68" y2="120" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="84" y1="40" x2="84" y2="120" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="36" y1="56" x2="100" y2="56" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="36" y1="72" x2="100" y2="72" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="36" y1="88" x2="100" y2="88" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="36" y1="104" x2="100" y2="104" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      {/* Compass */}
      <circle cx="68" cy="80" r="18" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      <circle cx="68" cy="80" r="2" fill="currentColor" />
      <line x1="68" y1="62" x2="68" y2="70" {...strokeProps} />
      <line x1="68" y1="90" x2="68" y2="98" {...strokeProps} opacity="0.4" />
      <line x1="50" y1="80" x2="58" y2="80" {...strokeProps} opacity="0.4" />
      <line x1="78" y1="80" x2="86" y2="80" {...strokeProps} />
      {/* Pencil */}
      <g transform="rotate(-45 120 40)">
        <rect x="112" y="24" width="16" height="32" rx="2" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
        <line x1="120" y1="56" x2="120" y2="64" {...strokeProps} />
        <line x1="116" y1="28" x2="124" y2="28" {...strokeProps} opacity="0.5" />
      </g>
      {/* Corner fold */}
      <path d="M92 32 L108 32 L108 48" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
    </g>
  );
}

function TasksIllustration() {
  return (
    <g>
      {/* Clipboard */}
      <rect x="44" y="28" width="72" height="104" rx="6" {...strokeProps} />
      <rect x="60" y="20" width="40" height="16" rx="4" {...strokeProps} fill="var(--card)" />
      <circle cx="80" cy="28" r="3" {...strokeProps} />
      {/* Checklist items */}
      <rect x="56" y="52" width="48" height="12" rx="3" {...strokeProps} />
      <rect x="56" y="74" width="48" height="12" rx="3" {...strokeProps} />
      <rect x="56" y="96" width="48" height="12" rx="3" {...strokeProps} />
      {/* Check marks (first one checked) */}
      <path d="M60 58 L63 61 L68 55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="60" y1="80" x2="68" y2="80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="60" y1="102" x2="68" y2="102" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Text placeholder lines */}
      <line x1="74" y1="58" x2="96" y2="58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="74" y1="80" x2="96" y2="80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="74" y1="102" x2="96" y2="102" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Decorative circle */}
      <circle cx="124" cy="124" r="16" {...strokeProps} opacity="0.12" fill={SUBTLE_FILL} fillOpacity={0.04} />
    </g>
  );
}

function SearchIllustration() {
  return (
    <g>
      {/* Document */}
      <rect x="36" y="24" width="60" height="80" rx="4" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      <path d="M84 24 L96 36 L96 24" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      {/* Text lines */}
      <line x1="48" y1="44" x2="84" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="48" y1="56" x2="80" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="48" y1="68" x2="76" y2="68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="48" y1="80" x2="68" y2="80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Magnifying glass */}
      <circle cx="100" cy="100" r="24" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      <circle cx="100" cy="100" r="16" {...strokeProps} />
      <line x1="111" y1="111" x2="128" y2="128" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Sparkle */}
      <circle cx="44" cy="120" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="52" cy="128" r="1.5" fill="currentColor" opacity="0.3" />
    </g>
  );
}

function ChatIllustration() {
  return (
    <g>
      {/* Large bubble (back) */}
      <rect x="24" y="40" width="72" height="44" rx="12" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      <path d="M40 84 L48 84 L44 96" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      {/* Small bubble (front) */}
      <rect x="60" y="68" width="72" height="44" rx="12" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={0.1} />
      <path d="M116 112 L108 112 L112 124" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={0.1} />
      {/* Dots in large bubble */}
      <circle cx="44" cy="62" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="56" cy="62" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="68" cy="62" r="3" fill="currentColor" opacity="0.5" />
      {/* Lines in small bubble */}
      <line x1="76" y1="82" x2="116" y2="82" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="76" y1="92" x2="108" y2="92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="76" y1="102" x2="100" y2="102" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </g>
  );
}

function GalleryIllustration() {
  return (
    <g>
      {/* Main frame */}
      <rect x="28" y="32" width="72" height="56" rx="4" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      {/* Landscape inside frame */}
      <path d="M28 68 L48 52 L64 64 L76 56 L100 68 L100 84 Q100 88 96 88 L32 88 Q28 88 28 84 Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" fill={SUBTLE_FILL} fillOpacity={0.04} />
      {/* Sun */}
      <circle cx="88" cy="48" r="6" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Small side frame */}
      <rect x="108" y="32" width="36" height="24" rx="3" {...strokeProps} opacity="0.5" />
      <rect x="108" y="64" width="36" height="24" rx="3" {...strokeProps} opacity="0.5" />
      {/* Mountain icon in small frames */}
      <path d="M116 48 L124 40 L132 48 L132 52 Q132 55 129 55 L115 55 Q112 55 112 52 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" opacity="0.25" />
      <path d="M116 80 L122 74 L128 80 L128 84 Q128 86 126 86 L114 86 Q112 86 112 84 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" opacity="0.25" />
      {/* Stand */}
      <line x1="64" y1="88" x2="64" y2="108" {...strokeProps} />
      <line x1="48" y1="108" x2="80" y2="108" {...strokeProps} />
    </g>
  );
}

function CalendarIllustration() {
  return (
    <g>
      {/* Calendar body */}
      <rect x="28" y="36" width="80" height="88" rx="6" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      {/* Calendar top bar */}
      <rect x="28" y="36" width="80" height="24" rx="6" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={0.12} />
      <line x1="28" y1="60" x2="108" y2="60" {...strokeProps} />
      {/* Binding rings */}
      <line x1="48" y1="28" x2="48" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="68" y1="28" x2="68" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="88" y1="28" x2="88" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Grid dots (calendar dates) */}
      {[
        [40, 68], [52, 68], [64, 68], [76, 68], [88, 68], [100, 68],
        [40, 80], [52, 80], [64, 80], [76, 80], [88, 80], [100, 80],
        [40, 92], [52, 92], [64, 92], [76, 92], [88, 92],
        [40, 104], [52, 104],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill="currentColor" opacity={i === 6 ? 0.8 : 0.2} />
      ))}
      {/* Highlight on one date */}
      <circle cx="52" cy="80" r="5" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={0.12} />
      {/* Clock icon overlay */}
      <circle cx="124" cy="120" r="20" {...strokeProps} fill="var(--card)" />
      <line x1="124" y1="108" x2="124" y2="120" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="124" y1="120" x2="132" y2="124" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function FilesIllustration() {
  return (
    <g>
      {/* Folder (back) */}
      <path d="M28 48 L28 120 Q28 124 32 124 L112 124 Q116 124 116 120 L116 56 Q116 52 112 52 L64 52 L56 44 L32 44 Q28 44 28 48 Z" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      {/* Folder tab accent */}
      <path d="M28 56 L116 56 L116 52 Q116 48 112 48 L64 48 L56 40 L32 40 Q28 40 28 44 Z" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={0.1} />
      {/* Papers sticking out */}
      <rect x="44" y="60" width="36" height="44" rx="2" {...strokeProps} fill="var(--card)" />
      <line x1="52" y1="72" x2="72" y2="72" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="52" y1="80" x2="68" y2="80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="52" y1="88" x2="64" y2="88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Second paper slightly offset */}
      <rect x="52" y="64" width="36" height="44" rx="2" {...strokeProps} fill="var(--card)" opacity="0.6" />
      <line x1="60" y1="76" x2="80" y2="76" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="60" y1="84" x2="76" y2="84" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
    </g>
  );
}

function TeamIllustration() {
  return (
    <g>
      {/* Center person */}
      <circle cx="68" cy="48" r="12" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      <path d="M44 92 Q44 72 68 72 Q92 72 92 92" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      {/* Left person (slightly behind) */}
      <circle cx="40" cy="56" r="10" {...strokeProps} opacity="0.4" fill={SUBTLE_FILL} fillOpacity={0.04} />
      <path d="M20 92 Q20 76 40 76 Q54 76 58 84" {...strokeProps} opacity="0.4" fill={SUBTLE_FILL} fillOpacity={0.04} />
      {/* Right person (slightly behind) */}
      <circle cx="96" cy="56" r="10" {...strokeProps} opacity="0.4" fill={SUBTLE_FILL} fillOpacity={0.04} />
      <path d="M78 84 Q82 76 96 76 Q116 76 116 92" {...strokeProps} opacity="0.4" fill={SUBTLE_FILL} fillOpacity={0.04} />
      {/* Connection dots */}
      <circle cx="68" cy="100" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="56" cy="104" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="80" cy="104" r="1.5" fill="currentColor" opacity="0.3" />
      <line x1="56" y1="104" x2="80" y2="104" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
      <line x1="56" y1="104" x2="68" y2="100" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
      <line x1="80" y1="104" x2="68" y2="100" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
    </g>
  );
}

function GenericIllustration() {
  return (
    <g>
      {/* Empty box */}
      <rect x="36" y="48" width="72" height="56" rx="6" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={SUBTLE_FILL_OPACITY} />
      {/* Box flap */}
      <path d="M36 64 L72 48 L108 64" {...strokeProps} fill={SUBTLE_FILL} fillOpacity={0.04} />
      <line x1="36" y1="64" x2="108" y2="64" {...strokeProps} />
      {/* Inside shadow lines */}
      <line x1="44" y1="72" x2="68" y2="72" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
      <line x1="44" y1="80" x2="60" y2="80" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
      {/* Sparkle (top-right) */}
      <path d="M116 32 L118 28 L120 32 L124 34 L120 36 L118 40 L116 36 L112 34 Z" fill="currentColor" opacity="0.5" />
      {/* Small sparkle */}
      <path d="M128 52 L129 49 L130 52 L133 53 L130 54 L129 57 L128 54 L125 53 Z" fill="currentColor" opacity="0.3" />
      {/* Tiny sparkle */}
      <path d="M108 24 L109 22 L110 24 L112 25 L110 26 L109 28 L108 26 L106 25 Z" fill="currentColor" opacity="0.2" />
    </g>
  );
}

// ── Illustration map ───────────────────────────────────────────────
const ILLUSTRATIONS: Record<EmptyStateProps['illustration'], React.FC> = {
  projects: ProjectsIllustration,
  tasks: TasksIllustration,
  search: SearchIllustration,
  chat: ChatIllustration,
  gallery: GalleryIllustration,
  calendar: CalendarIllustration,
  files: FilesIllustration,
  team: TeamIllustration,
  generic: GenericIllustration,
};

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export default function EmptyState({
  illustration,
  title,
  description,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const Illustration = ILLUSTRATIONS[illustration] ?? GenericIllustration;
  const size = compact ? 120 : 160;

  return (
    <div className={`card-elevated flex flex-col items-center justify-center text-center ${compact ? 'py-10' : 'py-16'} ${className}`}>
      {/* SVG illustration */}
      <div
        className={`skeuo-well empty-float text-[var(--af-accent)] mb-5 ${compact ? 'opacity-70' : ''}`}
        style={{ width: size, height: size }}
      >
        <svg {...svgBase(size)}>
          {Illustration ? <Illustration /> : null}
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-[13px] text-[var(--muted-foreground)] max-w-[260px] leading-relaxed">
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--af-accent)] text-background text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
