/**
 * Scene panel for a step. Renders a detailed, theme-matched, procedurally drawn
 * SVG illustration keyed by the step's `fallbackScene`, with the human caption
 * overlaid. The simulator is fully offline — there is no external map / street
 * view dependency, and no image assets (everything here is vector, generated).
 */
import type { SceneKind, StreetViewSpec } from '../../shared/types';
import './street-view.css';

interface StreetViewProps {
  spec: StreetViewSpec;
}

const SCENE_LABEL: Record<SceneKind, string> = {
  intersection: 'Intersection',
  residential: 'Residential street',
  highway_onramp: 'Highway on-ramp',
  straight: 'Straight road',
  curve: 'Curve',
  parking: 'Parking area',
};

/* palette */
const ROAD = '#27324f';
const ROAD_HI = '#313e60';
const CURB = '#3d4a73';
const YELLOW = '#f5c451';
const WHITE = '#c9d4f0';
const DIM = '#5d6a98';

export default function StreetView({ spec }: StreetViewProps) {
  return (
    <div className="sv">
      <div className="sv-stage">
        <SceneIllustration scene={spec.fallbackScene} />
        <div className="sv-caption">
          <span className="sv-caption-kind">{SCENE_LABEL[spec.fallbackScene]}</span>
          <span className="sv-caption-label">{spec.label}</span>
        </div>
      </div>
    </div>
  );
}

function SceneIllustration({ scene }: { scene: SceneKind }) {
  return (
    <svg
      className="sv-illus"
      viewBox="0 0 400 240"
      role="img"
      aria-label={SCENE_LABEL[scene]}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16224a" />
          <stop offset="100%" stopColor="#0e1730" />
        </linearGradient>
        <linearGradient id="sv-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2543" />
          <stop offset="100%" stopColor="#11182e" />
        </linearGradient>
        <radialGradient id="sv-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#2a3a6e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2a3a6e" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky + horizon glow + ground */}
      <rect x="0" y="0" width="400" height="116" fill="url(#sv-sky)" />
      <rect x="0" y="92" width="400" height="40" fill="url(#sv-glow)" />
      <rect x="0" y="116" width="400" height="124" fill="url(#sv-ground)" />
      {/* distant skyline silhouette */}
      <g fill="#1a2342" opacity="0.8">
        <rect x="18" y="92" width="22" height="24" />
        <rect x="44" y="84" width="16" height="32" />
        <rect x="320" y="88" width="20" height="28" />
        <rect x="350" y="96" width="30" height="20" />
      </g>

      {renderScene(scene)}
    </svg>
  );
}

/** A small car seen from behind, anchored at its bottom-centre. */
function Car({ x, y, s = 1, color = '#46568c' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-14" y="-18" width="28" height="18" rx="4" fill={color} />
      <rect x="-10" y="-15" width="20" height="8" rx="2" fill="#0d142b" />
      <rect x="-12" y="-3" width="5" height="3" rx="1" fill="#f04668" />
      <rect x="7" y="-3" width="5" height="3" rx="1" fill="#f04668" />
    </g>
  );
}

function renderScene(scene: SceneKind) {
  switch (scene) {
    case 'intersection':
      return (
        <g>
          {/* cross road */}
          <rect x="0" y="150" width="400" height="62" fill={ROAD} />
          {/* main road (perspective) */}
          <polygon points="150,240 250,240 222,116 178,116" fill={ROAD_HI} />
          {/* curbs */}
          <line x1="150" y1="240" x2="178" y2="116" stroke={CURB} strokeWidth="2" />
          <line x1="250" y1="240" x2="222" y2="116" stroke={CURB} strokeWidth="2" />
          {/* lane dashes */}
          <line x1="200" y1="212" x2="200" y2="240" stroke={YELLOW} strokeWidth="3" strokeDasharray="12 10" />
          <line x1="200" y1="116" x2="200" y2="150" stroke={YELLOW} strokeWidth="2" strokeDasharray="10 8" />
          {/* stop line + crosswalk */}
          <rect x="156" y="206" width="88" height="4" fill={WHITE} />
          {[160, 174, 188, 202, 216, 230].map((x) => (
            <rect key={x} x={x} y="150" width="7" height="56" fill={WHITE} opacity="0.5" />
          ))}
          {/* traffic light */}
          <rect x="286" y="78" width="4" height="40" fill={DIM} />
          <rect x="276" y="60" width="24" height="40" rx="5" fill="#0e1526" stroke={DIM} strokeWidth="1.5" />
          <circle cx="288" cy="70" r="5" fill="#f04668" />
          <circle cx="288" cy="82" r="5" fill="#3a2a1a" />
          <circle cx="288" cy="94" r="5" fill="#1f3a24" />
        </g>
      );

    case 'residential':
      return (
        <g>
          {/* road */}
          <polygon points="150,240 250,240 224,116 176,116" fill={ROAD_HI} />
          <line x1="200" y1="116" x2="200" y2="240" stroke={YELLOW} strokeWidth="3" strokeDasharray="16 14" />
          {/* houses left + right */}
          <g>
            <rect x="34" y="120" width="74" height="44" fill="#26315a" />
            <polygon points="30,120 71,92 112,120" fill="#36467d" />
            <rect x="50" y="134" width="16" height="16" fill="#0e1730" />
            <rect x="76" y="134" width="16" height="16" fill="#0e1730" />
          </g>
          <g>
            <rect x="296" y="124" width="70" height="40" fill="#222c52" />
            <polygon points="292,124 331,98 370,124" fill="#2f3e70" />
            <rect x="312" y="136" width="14" height="14" fill="#0e1730" />
          </g>
          {/* tree */}
          <rect x="124" y="150" width="5" height="20" fill="#3a2f22" />
          <circle cx="126" cy="146" r="14" fill="#1f5e44" />
          {/* parked car at right curb */}
          <Car x={262} y={196} s={0.9} />
        </g>
      );

    case 'highway_onramp':
      return (
        <g>
          {/* highway (left) */}
          <polygon points="120,240 250,240 238,116 196,116" fill={ROAD_HI} />
          {/* on-ramp merging from the right */}
          <polygon points="250,240 392,240 300,128 238,128" fill={ROAD} />
          {/* merge (dashed) line */}
          <line x1="250" y1="240" x2="238" y2="120" stroke={WHITE} strokeWidth="3" strokeDasharray="14 12" />
          {/* highway lane line */}
          <line x1="185" y1="240" x2="208" y2="116" stroke={YELLOW} strokeWidth="3" strokeDasharray="16 14" />
          {/* guardrail */}
          <line x1="110" y1="232" x2="190" y2="120" stroke={DIM} strokeWidth="2" />
          {[124, 150, 176].map((y, i) => (
            <line key={y} x1={120 - i * 5} y1={y + 70} x2={150 - i * 4} y2={y} stroke={DIM} strokeWidth="1" opacity="0.6" />
          ))}
          {/* distant traffic on the highway */}
          <Car x={205} y={150} s={0.6} />
          <Car x={196} y={132} s={0.45} color="#8a6bd6" />
        </g>
      );

    case 'curve':
      return (
        <g>
          <path d="M120 240 C 150 168, 286 176, 300 116 L 250 116 C 240 168, 168 168, 172 240 Z" fill={ROAD_HI} />
          <path d="M146 240 C 172 176, 264 180, 276 116" fill="none" stroke={YELLOW} strokeWidth="3" strokeDasharray="14 12" />
          {/* curve-ahead warning sign */}
          <rect x="306" y="96" width="4" height="34" fill={DIM} />
          <rect x="292" y="74" width="32" height="32" rx="4" transform="rotate(45 308 90)" fill="#f5a524" />
          <path d="M302 96 q 8 -10 14 -2" fill="none" stroke="#0e1730" strokeWidth="2.5" />
        </g>
      );

    case 'parking':
      return (
        <g>
          {/* road + curb */}
          <rect x="40" y="150" width="320" height="90" fill={ROAD_HI} />
          <rect x="40" y="150" width="320" height="4" fill={CURB} />
          {/* parallel parking bays */}
          {[70, 150, 230, 310].map((x) => (
            <line key={x} x1={x} y1="156" x2={x} y2="236" stroke={WHITE} strokeWidth="2" opacity="0.55" />
          ))}
          {/* one parked car in a bay */}
          <Car x={190} y={210} s={1} />
          {/* lane line */}
          <line x1="40" y1="200" x2="360" y2="200" stroke={YELLOW} strokeWidth="2" strokeDasharray="14 12" opacity="0.7" />
        </g>
      );

    case 'straight':
    default:
      return (
        <g>
          {/* perspective road */}
          <polygon points="150,240 250,240 222,116 178,116" fill={ROAD_HI} />
          {/* edge lines */}
          <line x1="150" y1="240" x2="178" y2="116" stroke={WHITE} strokeWidth="2" opacity="0.6" />
          <line x1="250" y1="240" x2="222" y2="116" stroke={WHITE} strokeWidth="2" opacity="0.6" />
          {/* centre dashes (perspective: longer/closer at the bottom) */}
          <line x1="200" y1="116" x2="200" y2="240" stroke={YELLOW} strokeWidth="3" strokeDasharray="6 8 10 12 16 16" />
          {/* lamp posts */}
          <g stroke={DIM} strokeWidth="2">
            <line x1="140" y1="150" x2="140" y2="120" />
            <line x1="140" y1="120" x2="152" y2="120" />
            <line x1="262" y1="150" x2="262" y2="120" />
            <line x1="262" y1="120" x2="250" y2="120" />
          </g>
          <circle cx="152" cy="121" r="2.5" fill={YELLOW} />
          <circle cx="250" cy="121" r="2.5" fill={YELLOW} />
          {/* a distant vehicle ahead */}
          <Car x={200} y={150} s={0.5} />
        </g>
      );
  }
}
