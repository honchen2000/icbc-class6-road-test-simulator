/**
 * Scene panel for a step. Renders a detailed, procedurally-drawn SVG scene keyed
 * by the step's `fallbackScene`, with the human caption overlaid. The scene is
 * lightly animated (flowing lane lines, an idling rider, pulsing lights) and
 * REACTS to the rider's tapped actions: the bike's turn indicator blinks while a
 * signal is on (and keeps blinking if it is never cancelled), the brake light
 * lights up, and the road speeds up / slows with accelerate / brake.
 *
 * Fully offline, no image assets. All motion is `prefers-reduced-motion`-safe
 * (see the global reduce rule in index.css) and decorative — the meaningful
 * state is always also conveyed in text by the action chips and fault list.
 */
import type { PerformedAction, SceneKind, StreetViewSpec } from '../../shared/types';
import './street-view.css';

interface StreetViewProps {
  spec: StreetViewSpec;
  /** The rider's actions this step — drives the reactive animation. */
  performed?: PerformedAction[];
}

interface SceneMotion {
  signal: 'left' | 'right' | null;
  speed: 'idle' | 'accel' | 'brake' | 'stop';
}

/** Reduce the tapped actions to the bike's current visible state. */
function deriveMotion(performed: PerformedAction[]): SceneMotion {
  let signal: SceneMotion['signal'] = null;
  let speed: SceneMotion['speed'] = 'idle';
  for (const p of performed) {
    switch (p.action) {
      case 'signal_left':
        signal = 'left';
        break;
      case 'signal_right':
        signal = 'right';
        break;
      case 'signal_cancel':
        signal = null;
        break;
      case 'accelerate':
        speed = 'accel';
        break;
      case 'brake':
        speed = 'brake';
        break;
      case 'stop':
        speed = 'stop';
        break;
      case 'maintain_speed':
        speed = 'idle';
        break;
    }
  }
  return { signal, speed };
}

const SCENE_LABEL: Record<SceneKind, string> = {
  intersection: 'Intersection',
  residential: 'Residential street',
  highway_onramp: 'Highway on-ramp',
  straight: 'Straight road',
  curve: 'Curve',
  parking: 'Parking area',
};

const ROAD = '#27324f';
const ROAD_HI = '#313e60';
const CURB = '#3d4a73';
const YELLOW = '#f5c451';
const WHITE = '#c9d4f0';
const DIM = '#5d6a98';

export default function StreetView({ spec, performed = [] }: StreetViewProps) {
  const motion = deriveMotion(performed);
  return (
    <div className="sv">
      <div className="sv-stage">
        <SceneIllustration scene={spec.fallbackScene} motion={motion} />
        <div className="sv-caption">
          <span className="sv-caption-kind">{SCENE_LABEL[spec.fallbackScene]}</span>
          <span className="sv-caption-label">{spec.label}</span>
        </div>
      </div>
    </div>
  );
}

function SceneIllustration({ scene, motion }: { scene: SceneKind; motion: SceneMotion }) {
  return (
    <svg
      className={`sv-illus sv-speed-${motion.speed}`}
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

      <rect x="0" y="0" width="400" height="116" fill="url(#sv-sky)" />
      <rect x="0" y="92" width="400" height="40" fill="url(#sv-glow)" />
      <rect x="0" y="116" width="400" height="124" fill="url(#sv-ground)" />

      {/* distant skyline (slow parallax) */}
      <g className="sv-bldg" fill="#1a2342" opacity="0.8">
        <rect x="18" y="92" width="22" height="24" />
        <rect x="44" y="84" width="16" height="32" />
        <rect x="320" y="88" width="20" height="28" />
        <rect x="350" y="96" width="30" height="20" />
      </g>

      {renderScene(scene, motion)}
    </svg>
  );
}

/** The rider's motorcycle in the foreground (rear view), with reactive lights. */
function RiderBike({ motion, x = 200 }: { motion: SceneMotion; x?: number }) {
  return (
    <Motorcycle
      x={x}
      y={238}
      s={1.15}
      signal={motion.signal}
      braking={motion.speed === 'brake' || motion.speed === 'stop'}
      bob
    />
  );
}

interface MotoProps {
  x: number;
  y: number;
  s?: number;
  color?: string;
  signal?: 'left' | 'right' | null;
  braking?: boolean;
  bob?: boolean;
}

/** A motorcycle + rider seen from behind, anchored at the tyre contact. */
function Motorcycle({ x, y, s = 1, color = '#46568c', signal = null, braking = false, bob = false }: MotoProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={bob ? 'sv-moto' : undefined}>
        {/* rear tyre */}
        <rect x="-5" y="-15" width="10" height="15" rx="4" fill="#0d142b" />
        {/* seat / tail unit + brake light */}
        <rect x="-7" y="-23" width="14" height="10" rx="3" fill={color} />
        <rect
          x="-3"
          y="-18"
          width="6"
          height="3"
          rx="1.5"
          fill={braking ? '#ff3b3b' : '#f04668'}
          className={braking ? 'sv-brake-on' : undefined}
        />
        {/* rider torso (back) + helmet */}
        <path d="M-7 -22 Q-8 -41 0 -44 Q8 -41 7 -22 Z" fill={color} />
        <circle cx="0" cy="-47" r="7" fill="#2a3a5e" />
        {/* handlebar turn indicators */}
        <circle cx="-12" cy="-36" r="2.6" fill="#f5a524" className={`sv-ind${signal === 'left' ? ' sv-ind-on' : ''}`} />
        <circle cx="12" cy="-36" r="2.6" fill="#f5a524" className={`sv-ind${signal === 'right' ? ' sv-ind-on' : ''}`} />
      </g>
    </g>
  );
}

/** A parked car seen from behind (a roadside hazard, not the rider). */
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

function renderScene(scene: SceneKind, motion: SceneMotion) {
  switch (scene) {
    case 'intersection':
      return (
        <g>
          <rect x="0" y="150" width="400" height="62" fill={ROAD} />
          <polygon points="150,240 250,240 222,116 178,116" fill={ROAD_HI} />
          <line x1="150" y1="240" x2="178" y2="116" stroke={CURB} strokeWidth="2" />
          <line x1="250" y1="240" x2="222" y2="116" stroke={CURB} strokeWidth="2" />
          {/* flowing approach lane line + static far line */}
          <line className="sv-flow" x1="200" y1="150" x2="200" y2="240" stroke={YELLOW} strokeWidth="3" strokeDasharray="14 16" />
          <line x1="200" y1="116" x2="200" y2="150" stroke={YELLOW} strokeWidth="2" strokeDasharray="8 8" />
          <rect x="156" y="206" width="88" height="4" fill={WHITE} />
          {[160, 174, 188, 202, 216, 230].map((cx) => (
            <rect key={cx} x={cx} y="150" width="7" height="56" fill={WHITE} opacity="0.5" />
          ))}
          {/* traffic light (lit lamp pulses) */}
          <rect x="286" y="78" width="4" height="40" fill={DIM} />
          <rect x="276" y="60" width="24" height="40" rx="5" fill="#0e1526" stroke={DIM} strokeWidth="1.5" />
          <circle className="sv-tl" cx="288" cy="70" r="5" fill="#f04668" />
          <circle cx="288" cy="82" r="5" fill="#3a2a1a" />
          <circle cx="288" cy="94" r="5" fill="#1f3a24" />
          <RiderBike motion={motion} />
        </g>
      );

    case 'residential':
      return (
        <g>
          <polygon points="150,240 250,240 224,116 176,116" fill={ROAD_HI} />
          <line className="sv-flow" x1="200" y1="116" x2="200" y2="240" stroke={YELLOW} strokeWidth="3" strokeDasharray="14 16" />
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
          <rect x="124" y="150" width="5" height="20" fill="#3a2f22" />
          <circle cx="126" cy="146" r="14" fill="#1f5e44" />
          {/* parked car (door-zone hazard) */}
          <Car x={278} y={196} s={0.85} />
          {/* a child's ball rolling toward the road (periodic) */}
          <circle className="sv-ball" cx="300" cy="172" r="6" fill="#f5a524" />
          <RiderBike motion={motion} />
        </g>
      );

    case 'highway_onramp':
      return (
        <g>
          <polygon points="120,240 250,240 238,116 196,116" fill={ROAD_HI} />
          <polygon points="250,240 392,240 300,128 238,128" fill={ROAD} />
          <line x1="250" y1="240" x2="238" y2="120" stroke={WHITE} strokeWidth="3" strokeDasharray="14 12" />
          <line className="sv-flow" x1="185" y1="240" x2="208" y2="116" stroke={YELLOW} strokeWidth="3" strokeDasharray="14 16" />
          <line x1="110" y1="232" x2="190" y2="120" stroke={DIM} strokeWidth="2" />
          {/* other riders on the highway ahead */}
          <Motorcycle x={208} y={150} s={0.55} />
          <Motorcycle x={198} y={132} s={0.4} color="#8a6bd6" />
          <RiderBike motion={motion} x={175} />
        </g>
      );

    case 'curve':
      return (
        <g>
          <path d="M120 240 C 150 168, 286 176, 300 116 L 250 116 C 240 168, 168 168, 172 240 Z" fill={ROAD_HI} />
          <path className="sv-flow" d="M146 240 C 172 176, 264 180, 276 116" fill="none" stroke={YELLOW} strokeWidth="3" strokeDasharray="14 16" />
          <rect x="306" y="96" width="4" height="34" fill={DIM} />
          <rect x="292" y="74" width="32" height="32" rx="4" transform="rotate(45 308 90)" fill="#f5a524" />
          <path d="M302 96 q 8 -10 14 -2" fill="none" stroke="#0e1730" strokeWidth="2.5" />
          <RiderBike motion={motion} x={196} />
        </g>
      );

    case 'parking':
      return (
        <g>
          <rect x="40" y="150" width="320" height="90" fill={ROAD_HI} />
          <rect x="40" y="150" width="320" height="4" fill={CURB} />
          {[70, 150, 230, 310].map((cx) => (
            <line key={cx} x1={cx} y1="156" x2={cx} y2="236" stroke={WHITE} strokeWidth="2" opacity="0.55" />
          ))}
          <Car x={110} y={210} s={1} />
          <line className="sv-flow" x1="40" y1="200" x2="360" y2="200" stroke={YELLOW} strokeWidth="2" strokeDasharray="14 16" opacity="0.7" />
          {/* the rider easing in to park at the right curb */}
          <Motorcycle x={250} y={232} s={1.1} signal={motion.signal} braking={motion.speed === 'brake' || motion.speed === 'stop'} bob />
        </g>
      );

    case 'straight':
    default:
      return (
        <g>
          <polygon points="150,240 250,240 222,116 178,116" fill={ROAD_HI} />
          <line x1="150" y1="240" x2="178" y2="116" stroke={WHITE} strokeWidth="2" opacity="0.6" />
          <line x1="250" y1="240" x2="222" y2="116" stroke={WHITE} strokeWidth="2" opacity="0.6" />
          <line className="sv-flow" x1="200" y1="116" x2="200" y2="240" stroke={YELLOW} strokeWidth="3" strokeDasharray="14 16" />
          <g stroke={DIM} strokeWidth="2">
            <line x1="140" y1="150" x2="140" y2="120" />
            <line x1="140" y1="120" x2="152" y2="120" />
            <line x1="262" y1="150" x2="262" y2="120" />
            <line x1="262" y1="120" x2="250" y2="120" />
          </g>
          <circle className="sv-lamp" cx="152" cy="121" r="2.5" fill={YELLOW} />
          <circle className="sv-lamp" cx="250" cy="121" r="2.5" fill={YELLOW} />
          <RiderBike motion={motion} />
        </g>
      );
  }
}
