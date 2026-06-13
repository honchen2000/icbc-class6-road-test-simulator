/**
 * Fault catalog. Every `faultCode` referenced by any scenario step MUST exist
 * here.
 *
 * Codes, severities, and coaching mirror the way ICBC examiners score the
 * Class 6 (motorcycle) road test against the five global skills: Observation,
 * Speed Control, Steering / Vehicle Control, Space Margins, and Communication.
 * Severity drives demerit points (see SEVERITY_POINTS); `auto_fail` and
 * `dangerous` items are the ones that end a real test on the spot.
 */
import type { FaultType } from '../shared/types';

export const FAULT_TYPES: FaultType[] = [
  /* ----------------------------------------------------------------- */
  /* Communication — signalling and, crucially, signal cancellation     */
  /* ----------------------------------------------------------------- */
  {
    code: 'NO_SIGNAL',
    skill: 'communication',
    severity: 'major',
    title: 'No signal given',
    description:
      'Changed direction or lane position without signalling your intention to other road users.',
    coaching:
      'Signal every turn and lane change, even when the road looks empty. The examiner is checking your habit, not the traffic.',
  },
  {
    code: 'SIGNAL_TOO_LATE',
    skill: 'communication',
    severity: 'minor',
    title: 'Signal given too late',
    description:
      'The signal came on with too little warning before the maneuver (less than roughly three seconds).',
    coaching:
      'Signal early — at least 3 seconds (about 5 flashes) before you start to turn or change lanes — so others can react.',
  },
  {
    code: 'SIGNAL_NOT_CANCELLED',
    skill: 'communication',
    severity: 'major',
    title: 'Signal not cancelled',
    description:
      'The turn signal was left flashing after the maneuver was complete, sending a misleading message to other traffic.',
    coaching:
      'Motorcycle signals often do not self-cancel. Reach down and cancel it immediately after straightening out — examiners watch for this every single turn.',
  },
  {
    code: 'WRONG_SIGNAL_DIRECTION',
    skill: 'communication',
    severity: 'major',
    title: 'Wrong signal direction',
    description: 'Signalled the opposite direction to the maneuver actually performed.',
    coaching:
      'Glance at your intention before your thumb moves — a left signal before a right turn confuses and endangers everyone around you.',
  },
  {
    code: 'NO_BRAKE_LIGHT_WARNING',
    skill: 'communication',
    severity: 'minor',
    title: 'No slowing warning to following traffic',
    description:
      'Slowed abruptly for a turn or stop without first easing the brake to warn drivers behind.',
    coaching:
      'Cover and feather the brake early so your brake light flashes a warning before you scrub off real speed.',
  },

  /* ----------------------------------------------------------------- */
  /* Observation — mirrors, shoulder checks, blind spots                */
  /* ----------------------------------------------------------------- */
  {
    code: 'MIRROR_CHECK_MISSED',
    skill: 'observation',
    severity: 'major',
    title: 'Mirror check missed',
    description:
      'Failed to check the mirror before a change of speed, lane position, or direction.',
    coaching:
      'Build a rhythm: mirror, signal, shoulder check, then act. The mirror check comes first, before you even signal.',
  },
  {
    code: 'SHOULDER_CHECK_MISSED',
    skill: 'observation',
    severity: 'major',
    title: 'Shoulder check missed',
    description:
      'Turned or changed lane position without a shoulder check into the direction of travel.',
    coaching:
      'Mirrors do not cover your blind spot. Always turn your head toward the direction you are moving before you commit.',
  },
  {
    code: 'BLIND_SPOT_NOT_CHECKED',
    skill: 'observation',
    severity: 'dangerous',
    title: 'Blind spot not checked before merge',
    description:
      'Merged or changed lanes into a travel lane without confirming the blind spot was clear.',
    coaching:
      'On a merge a missed blind spot can put a car right beside you. Head-check the lane you are entering every time.',
  },
  {
    code: 'NO_INTERSECTION_SCAN',
    skill: 'observation',
    severity: 'major',
    title: 'Intersection not scanned',
    description:
      'Entered an intersection without scanning left-right-left for cross traffic and pedestrians.',
    coaching:
      'Scan left, right, then left again before entering any intersection — the second left look catches a pedestrian stepping off the curb.',
  },
  {
    code: 'PEDESTRIAN_NOT_CHECKED',
    skill: 'observation',
    severity: 'dangerous',
    title: 'Crosswalk not checked',
    description: 'Turned across a crosswalk without checking for pedestrians.',
    coaching:
      'Before turning, sweep the crosswalk on the road you are entering. Pedestrians in a marked crosswalk always have right of way.',
  },
  {
    code: 'NO_REOBSERVATION_BEFORE_PROCEED',
    skill: 'observation',
    severity: 'major',
    title: 'No re-check before proceeding',
    description:
      'Proceeded from a stop without a final scan of the intersection after the path appeared clear.',
    coaching:
      'After a stop, take one more look both ways before you release the brake — conditions change in the seconds you waited.',
  },

  /* ----------------------------------------------------------------- */
  /* Speed Control                                                      */
  /* ----------------------------------------------------------------- */
  {
    code: 'SPEED_TOO_FAST',
    skill: 'speed',
    severity: 'major',
    title: 'Speed too fast for the zone',
    description: 'Exceeded the posted speed limit or drove too fast for the conditions.',
    coaching:
      'Glance at your speedo on every straight. Riding even a little over the limit on test day is an easy fault to avoid.',
  },
  {
    code: 'SPEED_TOO_SLOW',
    skill: 'speed',
    severity: 'minor',
    title: 'Speed too slow / impeding traffic',
    description:
      'Travelled well below the limit without cause, holding up the normal flow of traffic.',
    coaching:
      'Riding too slowly is also a fault. Keep up with the reasonable flow unless conditions genuinely require less speed.',
  },
  {
    code: 'NO_SPEED_ADJUST_FOR_TURN',
    skill: 'speed',
    severity: 'major',
    title: 'Did not slow for the turn',
    description: 'Entered a turn or curve carrying too much speed for safe, controlled cornering.',
    coaching:
      'Slow down before the turn, not during it. Set your entry speed early so you can roll on smoothly through the corner.',
  },
  {
    code: 'HARSH_BRAKING',
    skill: 'speed',
    severity: 'major',
    title: 'Harsh / abrupt braking',
    description: 'Braked late and hard enough to upset the bike or surprise following traffic.',
    coaching:
      'Look further ahead so you can brake early and progressively. Smooth, planned braking is what examiners want to see.',
  },
  {
    code: 'ABRUPT_ACCELERATION',
    skill: 'speed',
    severity: 'minor',
    title: 'Jerky acceleration',
    description: 'Opened the throttle abruptly, causing the bike to lurch.',
    coaching:
      'Roll the throttle on smoothly and progressively — abrupt inputs cost control marks and unsettle the motorcycle.',
  },

  /* ----------------------------------------------------------------- */
  /* Steering / Vehicle Control                                         */
  /* ----------------------------------------------------------------- */
  {
    code: 'COASTING_IN_NEUTRAL',
    skill: 'steering',
    severity: 'major',
    title: 'Coasting in neutral',
    description:
      'Rolled through a turn or toward a stop with the clutch pulled in or in neutral, losing drive control.',
    coaching:
      'Stay in gear with the clutch engaged through turns. Coasting removes your ability to power out of trouble.',
  },
  {
    code: 'POOR_CLUTCH_CONTROL',
    skill: 'steering',
    severity: 'minor',
    title: 'Poor clutch / throttle control',
    description: 'Stalled or lurched from clumsy clutch and throttle coordination.',
    coaching:
      'Practise smooth friction-zone starts. A stall at a busy intersection on test day rattles your whole run.',
  },
  {
    code: 'FOOT_DOWN_WHILE_MOVING',
    skill: 'steering',
    severity: 'minor',
    title: 'Foot off the peg while moving',
    description: 'Dragged or dangled a foot while the motorcycle was still in motion.',
    coaching:
      'Feet stay on the pegs until the bike has fully stopped, and go back up as soon as you move off.',
  },
  {
    code: 'WIDE_TURN',
    skill: 'steering',
    severity: 'major',
    title: 'Turn taken too wide',
    description: 'Swung wide on a turn and finished in the wrong part of, or outside, the lane.',
    coaching:
      'Look through the turn to where you want to exit. Slower entry speed lets you hold a tighter, tidier line.',
  },
  {
    code: 'UNSTABLE_LOW_SPEED',
    skill: 'steering',
    severity: 'minor',
    title: 'Unstable at low speed',
    description: 'Wobbled or struggled to balance the motorcycle at low speed.',
    coaching:
      'Use light rear brake and steady throttle to stabilise at walking pace; keep your eyes up, not on the front wheel.',
  },

  /* ----------------------------------------------------------------- */
  /* Space Margins — lane position, following distance, clearance        */
  /* ----------------------------------------------------------------- */
  {
    code: 'IMPROPER_LANE_POSITION',
    skill: 'space',
    severity: 'major',
    title: 'Improper lane position',
    description:
      'Rode in a lane position that gave away your space cushion or visibility (e.g. drifting into the gutter or centre line).',
    coaching:
      'Choose the lane third that maximises your visibility and escape space, and hold it deliberately rather than drifting.',
  },
  {
    code: 'WRONG_LANE_AFTER_TURN',
    skill: 'space',
    severity: 'major',
    title: 'Ended in the wrong lane after turning',
    description:
      'Finished a turn in the wrong lane — e.g. a left turn that should end in the nearest legal lane landed in a far lane.',
    coaching:
      'Turn into the nearest lane that matches your turn. Crossing extra lanes mid-turn is unsafe and marks you down.',
  },
  {
    code: 'FOLLOWING_TOO_CLOSE',
    skill: 'space',
    severity: 'major',
    title: 'Following too closely',
    description: 'Left less than a safe following gap behind the vehicle ahead.',
    coaching:
      'Keep at least a 2-second gap (more in the wet). On a bike that cushion is your braking and swerving room.',
  },
  {
    code: 'FAILED_TO_YIELD',
    skill: 'space',
    severity: 'dangerous',
    title: 'Failed to yield right of way',
    description:
      'Did not yield to traffic or pedestrians that had the right of way, forcing them to react.',
    coaching:
      'When in doubt, yield. Making another road user brake or swerve for you is a serious, test-ending error.',
  },
  {
    code: 'UNSAFE_GAP_SELECTION',
    skill: 'space',
    severity: 'dangerous',
    title: 'Unsafe gap accepted',
    description:
      'Pulled out or merged into a gap that was too small, forcing other traffic to slow.',
    coaching:
      'Wait for a gap you are certain of. A motorcycle accelerates quickly, but a misjudged gap is still dangerous.',
  },
  {
    code: 'INSUFFICIENT_CLEARANCE',
    skill: 'space',
    severity: 'minor',
    title: 'Too little clearance to hazards',
    description:
      'Passed parked cars, cyclists, or pedestrians without leaving adequate side clearance.',
    coaching:
      'Move within your lane to buy at least a metre of space past parked cars (door zone) and vulnerable road users.',
  },
  {
    code: 'STOPPED_IN_CROSSWALK',
    skill: 'space',
    severity: 'major',
    title: 'Stopped over the line / in the crosswalk',
    description:
      'Stopped with the motorcycle over the stop line or encroaching into the crosswalk.',
    coaching:
      'Stop behind the stop line or, if none, before the crosswalk. Creeping forward blocks pedestrians and costs marks.',
  },

  /* ----------------------------------------------------------------- */
  /* Auto-fail / serious legal violations                               */
  /* ----------------------------------------------------------------- */
  {
    code: 'RAN_STOP_SIGN',
    skill: 'observation',
    severity: 'auto_fail',
    title: 'Ran a stop sign',
    description: 'Proceeded through a stop sign without coming to a complete stop.',
    coaching:
      'A full, wheels-stopped halt at every stop sign is mandatory. Failing to stop is an immediate test failure.',
  },
  {
    code: 'ROLLING_STOP',
    skill: 'speed',
    severity: 'major',
    title: 'Rolling stop (incomplete stop)',
    description:
      'Slowed at a stop sign but kept creeping without ever coming to a complete stop.',
    coaching:
      'Come to a definite, complete stop — feel the bike rock back. A rolling "California stop" is a guaranteed fault.',
  },
  {
    code: 'RAN_RED_LIGHT',
    skill: 'observation',
    severity: 'auto_fail',
    title: 'Ran a red light',
    description: 'Entered the intersection on a red signal.',
    coaching:
      'Stop on yellow when it is safe to do so, and never enter on red. Running a red ends the test instantly.',
  },
  {
    code: 'HOV_LANE_VIOLATION',
    skill: 'space',
    severity: 'auto_fail',
    title: 'Illegally entered an HOV / restricted lane',
    description:
      'Entered a high-occupancy-vehicle or otherwise restricted lane that you were not permitted to use.',
    coaching:
      'Read the lane markings and signs before turning. Entering an HOV lane you cannot legally use is an automatic fail.',
  },
  {
    code: 'CROSSED_SOLID_LINE',
    skill: 'space',
    severity: 'major',
    title: 'Crossed a solid line',
    description:
      'Crossed a solid white or yellow line where crossing is prohibited (lane line or centre line).',
    coaching:
      'A solid line means do not cross. Plan your lane choice before the markings turn solid so you are never trapped.',
  },
  {
    code: 'WRONG_SIDE_OF_ROAD',
    skill: 'space',
    severity: 'dangerous',
    title: 'Drove on the wrong side of the road',
    description: 'Allowed the motorcycle onto the wrong side of the centre line.',
    coaching:
      'Keep right of the centre line at all times except where a lawful pass or turn requires otherwise.',
  },
  {
    code: 'DANGEROUS_ACTION',
    skill: 'steering',
    severity: 'auto_fail',
    title: 'Dangerous action / examiner intervention',
    description:
      'Performed an action so unsafe that the examiner had to intervene or that created immediate danger.',
    coaching:
      'Any move that forces examiner intervention ends the test. Ride defensively and never gamble on a marginal decision.',
  },
];
