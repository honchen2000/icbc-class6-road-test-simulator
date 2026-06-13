/**
 * Richmond test-route scenarios. Each scenario is a decision-tree of
 * ScenarioSteps.
 *
 * Routes are modelled on the real Richmond, BC ICBC test-centre catchment
 * (Class 6 motorcycle). Coordinates are plausible Richmond locations; the UI
 * renders the illustrated `fallbackScene` for each step.
 *
 * Convention enforced on EVERY turn step:
 *   - timing: signal_before (minMs 3000, SIGNAL_TOO_LATE)
 *   - timing: signal_cancel_after (maxMs 3000, SIGNAL_NOT_CANCELLED)
 *   - timing: observation_before (the relevant shoulder check)
 * Every faultCode referenced below exists in ../content/faults.ts (FAULT_TYPES).
 */
import type { Scenario } from '../shared/types';

export const SCENARIOS: Scenario[] = [
  /* =================================================================== */
  /* 1. No. 3 Road & Westminster Highway                                  */
  /* =================================================================== */
  {
    id: 'richmond-no3-westminster',
    name: 'No. 3 Road & Westminster Highway',
    area: 'Richmond, BC',
    description:
      'A busy arterial run on No. 3 Road through the Westminster Highway intersection: signalled lane changes, a protected left turn, and dense city-centre traffic.',
    difficulty: 'medium',
    estimatedMinutes: 9,
    tags: ['arterial', 'intersection', 'lane-change', 'city-centre'],
    steps: [
      {
        id: 'no3-1-depart',
        title: 'Depart northbound on No. 3 Road',
        situation:
          'You are stopped at the curb on No. 3 Road just south of Granville Avenue, facing north. Traffic in the right lane is light.',
        instruction:
          'When it is safe, pull away from the curb and continue north on No. 3 Road in the right-hand lane.',
        streetView: {
          location: '49.1666,-123.1361',
          heading: 0,
          label: 'No. 3 Rd south of Granville Ave, facing north',
          fallbackScene: 'straight',
        },
        maneuver: 'start',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_left', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_left',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'proceed', skill: 'steering', order: 4, faultCode: 'POOR_CLUTCH_CONTROL' },
          { action: 'signal_cancel', skill: 'communication', order: 5, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'accelerate', faultCode: 'ABRUPT_ACCELERATION' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_left',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_left',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'Mirror, signal, shoulder check, then ease out — feet up as soon as you roll.',
      },
      {
        id: 'no3-2-maintain',
        title: 'Maintain lane through the corridor',
        situation:
          'You are rolling north in the right lane approaching Cook Road. A delivery van is parked ahead near the curb.',
        instruction:
          'Continue north, keep a safe following distance, and leave clearance as you pass the parked van.',
        streetView: {
          location: '49.1701,-123.1361',
          heading: 0,
          label: 'No. 3 Rd near Cook Rd, facing north',
          fallbackScene: 'straight',
        },
        maneuver: 'straight',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'maintain_speed', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_SLOW' },
          { action: 'lane_left', skill: 'space', order: 3, faultCode: 'INSUFFICIENT_CLEARANCE' },
        ],
        prohibited: [
          { action: 'accelerate', faultCode: 'SPEED_TOO_FAST' },
          { action: 'lane_right', faultCode: 'INSUFFICIENT_CLEARANCE' },
        ],
        hint: 'Buy clearance past the parked van without crowding the lane to your left.',
      },
      {
        id: 'no3-3-lane-change',
        title: 'Move to the left lane for the upcoming turn',
        situation:
          'Westminster Highway is two blocks ahead and you will need the left lane to turn. There is a gap in the left lane behind you.',
        instruction:
          'Change into the left lane when it is safe so you are positioned for a left turn at Westminster Highway.',
        streetView: {
          location: '49.1740,-123.1361',
          heading: 0,
          label: 'No. 3 Rd approaching Westminster Hwy, facing north',
          fallbackScene: 'straight',
        },
        maneuver: 'lane_change_left',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_left', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_left',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'lane_left', skill: 'space', order: 4, faultCode: 'IMPROPER_LANE_POSITION' },
          { action: 'signal_cancel', skill: 'communication', order: 5, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'turn_left', faultCode: 'WRONG_LANE_AFTER_TURN' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_left',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_left',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'Mirror, signal, head-check the blind spot, then move over decisively.',
      },
      {
        id: 'no3-4-approach-light',
        title: 'Approach the Westminster Highway signal',
        situation:
          'The light at Westminster Highway is green but has been green a while. You are in the left lane for your turn.',
        instruction:
          'Approach the intersection ready to turn left. Be prepared to stop if the light changes.',
        streetView: {
          location: '49.1759,-123.1361',
          heading: 0,
          label: 'No. 3 Rd & Westminster Hwy, facing north',
          fallbackScene: 'intersection',
        },
        maneuver: 'straight',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'brake', skill: 'speed', order: 2, faultCode: 'NO_BRAKE_LIGHT_WARNING' },
          { action: 'maintain_speed', skill: 'speed', order: 3, faultCode: 'NO_SPEED_ADJUST_FOR_TURN' },
        ],
        prohibited: [
          { action: 'accelerate', faultCode: 'NO_SPEED_ADJUST_FOR_TURN' },
          { action: 'turn_left', faultCode: 'NO_SPEED_ADJUST_FOR_TURN' },
        ],
        hint: 'A stale green can turn yellow — cover the brake and be ready to stop.',
      },
      {
        id: 'no3-5-left-turn',
        title: 'Complete the left turn onto Westminster Highway',
        situation:
          'You have a green left-turn arrow. Oncoming traffic is held. A pedestrian is waiting at the far corner.',
        instruction:
          'Turn left onto Westminster Highway, finishing in the nearest westbound lane.',
        streetView: {
          location: '49.1759,-123.1361',
          heading: 270,
          label: 'No. 3 Rd & Westminster Hwy, turning west',
          fallbackScene: 'intersection',
        },
        maneuver: 'left_turn',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_left', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_left',
            skill: 'observation',
            order: 3,
            faultCode: 'PEDESTRIAN_NOT_CHECKED',
            critical: true,
          },
          { action: 'turn_left', skill: 'steering', order: 4, faultCode: 'WIDE_TURN' },
          { action: 'lane_right', skill: 'space', order: 5, faultCode: 'WRONG_LANE_AFTER_TURN' },
          { action: 'signal_cancel', skill: 'communication', order: 6, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [
          { action: 'accelerate', faultCode: 'FAILED_TO_YIELD' },
          { action: 'lane_left', faultCode: 'WRONG_LANE_AFTER_TURN' },
        ],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_left',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_left',
            relativeTo: 'maneuver',
            faultCode: 'PEDESTRIAN_NOT_CHECKED',
          },
        ],
        hint: 'Check the crosswalk for the waiting pedestrian, then turn into the nearest lane and cancel your signal.',
      },
    ],
  },

  /* =================================================================== */
  /* 2. Lansdowne Road                                                    */
  /* =================================================================== */
  {
    id: 'richmond-lansdowne-road',
    name: 'Lansdowne Road Circuit',
    area: 'Richmond, BC',
    description:
      'A mixed run along Lansdowne Road: a controlled right turn, a posted speed zone past Lansdowne Centre, a lane change, and a stop-controlled intersection.',
    difficulty: 'medium',
    estimatedMinutes: 8,
    tags: ['arterial', 'right-turn', 'stop-sign', 'shopping-district'],
    steps: [
      {
        id: 'lans-1-right-turn',
        title: 'Right turn onto Lansdowne Road',
        situation:
          'You are stopped on Alderbridge Way, facing east, waiting to turn right onto Lansdowne Road. A cyclist is approaching in the bike lane on your right.',
        instruction:
          'Turn right onto Lansdowne Road when the bike lane and traffic are clear.',
        streetView: {
          location: '49.1693,-123.1366',
          heading: 90,
          label: 'Alderbridge Way & Lansdowne Rd, turning south',
          fallbackScene: 'intersection',
        },
        maneuver: 'right_turn',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_right', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_right',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'wait', skill: 'space', order: 4, faultCode: 'FAILED_TO_YIELD' },
          { action: 'turn_right', skill: 'steering', order: 5, faultCode: 'WIDE_TURN' },
          { action: 'signal_cancel', skill: 'communication', order: 6, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'proceed', faultCode: 'FAILED_TO_YIELD' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_right',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_right',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'Shoulder-check right for the cyclist in the bike lane, then wait for the cyclist to pass before you commit to the turn.',
      },
      {
        id: 'lans-2-speed-zone',
        title: 'Past Lansdowne Centre',
        situation:
          'You are riding south past Lansdowne Centre. The posted limit is 50 and there is moderate traffic with vehicles entering and leaving the mall.',
        instruction:
          'Continue at a safe, legal speed and keep a good following distance from the car ahead.',
        streetView: {
          location: '49.1671,-123.1366',
          heading: 180,
          label: 'Lansdowne Rd at Lansdowne Centre, facing south',
          fallbackScene: 'straight',
        },
        maneuver: 'straight',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'maintain_speed', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_FAST' },
          { action: 'lane_left', skill: 'space', order: 3, faultCode: 'IMPROPER_LANE_POSITION' },
        ],
        prohibited: [
          { action: 'accelerate', faultCode: 'SPEED_TOO_FAST' },
          { action: 'proceed', faultCode: 'FOLLOWING_TOO_CLOSE' },
        ],
        hint: 'Ride the left wheel track for visibility and space from cars pulling out of the mall — never sit on the greasy centre strip. Keep your 2-second gap.',
      },
      {
        id: 'lans-3-lane-change',
        title: 'Change to the right lane',
        situation:
          'You will need the right lane for an upcoming right turn at No. 3 Road. There is space in the right lane.',
        instruction: 'Move into the right lane when it is safe.',
        streetView: {
          location: '49.1660,-123.1366',
          heading: 180,
          label: 'Lansdowne Rd approaching No. 3 Rd, facing south',
          fallbackScene: 'straight',
        },
        maneuver: 'lane_change_right',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_right', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_right',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'lane_right', skill: 'space', order: 4, faultCode: 'IMPROPER_LANE_POSITION' },
          { action: 'signal_cancel', skill: 'communication', order: 5, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'lane_left', faultCode: 'IMPROPER_LANE_POSITION' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_right',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_right',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'Mirror, signal, head-check right, then move over and cancel.',
      },
      {
        id: 'lans-4-stop-sign',
        title: 'Two-way stop at the side street',
        situation:
          'You reach a stop sign at a quiet side street. Cross traffic on the through road has no stop.',
        instruction:
          'Make a complete stop, check the intersection, and proceed straight when it is clear and safe.',
        streetView: {
          location: '49.1648,-123.1366',
          heading: 180,
          label: 'Lansdowne Rd side-street stop, facing south',
          fallbackScene: 'intersection',
        },
        maneuver: 'stop',
        speedZoneKph: 50,
        expected: [
          { action: 'brake', skill: 'speed', order: 1, faultCode: 'HARSH_BRAKING' },
          { action: 'stop', skill: 'speed', order: 2, faultCode: 'ROLLING_STOP', critical: true },
          {
            action: 'shoulder_left',
            skill: 'observation',
            order: 3,
            faultCode: 'NO_INTERSECTION_SCAN',
          },
          { action: 'proceed', skill: 'steering', order: 4, faultCode: 'NO_REOBSERVATION_BEFORE_PROCEED' },
        ],
        prohibited: [
          { action: 'proceed', faultCode: 'RAN_STOP_SIGN' },
          { action: 'accelerate', faultCode: 'RAN_STOP_SIGN' },
        ],
        hint: 'Come to a full, definite stop behind the line, scan, then go — no rolling through.',
      },
      {
        id: 'lans-5-right-turn-no3',
        title: 'Right turn onto No. 3 Road',
        situation:
          'At No. 3 Road you will turn right to head north. Pedestrians have a walk signal at the corner.',
        instruction:
          'Turn right onto No. 3 Road, yielding to any pedestrians, and finish in the nearest lane.',
        streetView: {
          location: '49.1637,-123.1366',
          heading: 0,
          label: 'Lansdowne Rd & No. 3 Rd, turning north',
          fallbackScene: 'intersection',
        },
        maneuver: 'right_turn',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_right', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_right',
            skill: 'observation',
            order: 3,
            faultCode: 'PEDESTRIAN_NOT_CHECKED',
            critical: true,
          },
          { action: 'turn_right', skill: 'steering', order: 4, faultCode: 'WIDE_TURN' },
          { action: 'lane_right', skill: 'space', order: 5, faultCode: 'WRONG_LANE_AFTER_TURN' },
          { action: 'signal_cancel', skill: 'communication', order: 6, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'proceed', faultCode: 'PEDESTRIAN_NOT_CHECKED' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_right',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_right',
            relativeTo: 'maneuver',
            faultCode: 'PEDESTRIAN_NOT_CHECKED',
          },
        ],
        hint: 'Yield to pedestrians in the crosswalk, turn into the near lane, then cancel the signal.',
      },
    ],
  },

  /* =================================================================== */
  /* 3. Garden City Road residential                                     */
  /* =================================================================== */
  {
    id: 'richmond-garden-city-residential',
    name: 'Garden City Road Residential',
    area: 'Richmond, BC',
    description:
      'Quiet residential riding off Garden City Road: a 30 km/h school/playground zone, an uncontrolled intersection, a residential left turn, and curb-side parking practice.',
    difficulty: 'easy',
    estimatedMinutes: 7,
    tags: ['residential', 'school-zone', 'uncontrolled', 'parking'],
    steps: [
      {
        id: 'gc-1-residential-start',
        title: 'Enter the residential street',
        situation:
          'You turn off Garden City Road into a residential street lined with parked cars and driveways. Children may be present.',
        instruction:
          'Ride down the residential street at an appropriate low speed, watching for hazards between parked cars.',
        streetView: {
          location: '49.1602,-123.1289',
          heading: 90,
          label: 'Residential street off Garden City Rd, facing east',
          fallbackScene: 'residential',
        },
        maneuver: 'straight',
        speedZoneKph: 30,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'maintain_speed', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_FAST' },
          { action: 'lane_left', skill: 'space', order: 3, faultCode: 'INSUFFICIENT_CLEARANCE' },
        ],
        prohibited: [{ action: 'accelerate', faultCode: 'SPEED_TOO_FAST' }],
        hint: 'Keep it slow and ride the left wheel track for door-zone clearance past the parked cars — watch for kids and opening doors.',
      },
      {
        id: 'gc-2-school-zone',
        title: 'School / playground zone',
        situation:
          'A 30 km/h playground zone is in effect. A ball rolls toward the road from a front yard on the right.',
        instruction:
          'Slow appropriately for the playground zone and the hazard, and be ready to stop.',
        streetView: {
          location: '49.1602,-123.1265',
          heading: 90,
          label: 'Playground zone, residential street, facing east',
          fallbackScene: 'residential',
        },
        maneuver: 'straight',
        speedZoneKph: 30,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'brake', skill: 'speed', order: 2, faultCode: 'NO_BRAKE_LIGHT_WARNING' },
          { action: 'maintain_speed', skill: 'speed', order: 3, faultCode: 'SPEED_TOO_FAST', critical: true },
        ],
        prohibited: [
          { action: 'accelerate', faultCode: 'SPEED_TOO_FAST' },
          { action: 'proceed', faultCode: 'FAILED_TO_YIELD' },
        ],
        hint: 'A ball means a child may follow. Cover the brake and be ready to stop completely.',
      },
      {
        id: 'gc-3-uncontrolled',
        title: 'Uncontrolled intersection',
        situation:
          'You reach an uncontrolled residential intersection with no signs in any direction. A car is approaching from your right.',
        instruction:
          'Approach the uncontrolled intersection, yield as required, and proceed straight when safe.',
        streetView: {
          location: '49.1602,-123.1241',
          heading: 90,
          label: 'Uncontrolled residential intersection, facing east',
          fallbackScene: 'intersection',
        },
        maneuver: 'straight',
        speedZoneKph: 30,
        expected: [
          { action: 'shoulder_right', skill: 'observation', order: 1, faultCode: 'NO_INTERSECTION_SCAN', critical: true },
          { action: 'shoulder_left', skill: 'observation', order: 2, faultCode: 'NO_INTERSECTION_SCAN' },
          { action: 'brake', skill: 'speed', order: 3, faultCode: 'NO_SPEED_ADJUST_FOR_TURN' },
          { action: 'wait', skill: 'space', order: 4, faultCode: 'FAILED_TO_YIELD' },
          { action: 'proceed', skill: 'steering', order: 5, faultCode: 'NO_REOBSERVATION_BEFORE_PROCEED' },
        ],
        prohibited: [
          { action: 'accelerate', faultCode: 'FAILED_TO_YIELD' },
          { action: 'maintain_speed', faultCode: 'NO_SPEED_ADJUST_FOR_TURN' },
        ],
        hint: 'At an uncontrolled intersection yield to the vehicle on your right; scan both ways and slow right down.',
      },
      {
        id: 'gc-4-left-turn',
        title: 'Left turn at the next residential corner',
        situation:
          'You will turn left onto another residential street. There is no oncoming traffic.',
        instruction:
          'Turn left at the corner, finishing on the correct side of the road in the nearest lane.',
        streetView: {
          location: '49.1602,-123.1217',
          heading: 0,
          label: 'Residential left turn off the side street, turning north',
          fallbackScene: 'intersection',
        },
        maneuver: 'left_turn',
        speedZoneKph: 30,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_left', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_left',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'turn_left', skill: 'steering', order: 4, faultCode: 'WIDE_TURN' },
          { action: 'lane_right', skill: 'space', order: 5, faultCode: 'WRONG_SIDE_OF_ROAD' },
          { action: 'signal_cancel', skill: 'communication', order: 6, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'lane_left', faultCode: 'WRONG_SIDE_OF_ROAD' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_left',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_left',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'Keep the turn tight to the correct side of the road, then cancel the signal.',
      },
      {
        id: 'gc-5-park',
        title: 'Pull over and park at the curb',
        situation:
          'The examiner asks you to pull over and stop at the right curb in a legal spot ahead.',
        instruction:
          'Signal, check your blind spot, and pull over to stop parallel to the right curb.',
        streetView: {
          location: '49.1620,-123.1217',
          heading: 0,
          label: 'Curb-side parking spot, residential street, facing north',
          fallbackScene: 'parking',
        },
        maneuver: 'park',
        speedZoneKph: 30,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_right', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_right',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'brake', skill: 'speed', order: 4, faultCode: 'HARSH_BRAKING' },
          { action: 'stop', skill: 'speed', order: 5, faultCode: 'UNSTABLE_LOW_SPEED' },
          { action: 'signal_cancel', skill: 'communication', order: 6, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'accelerate', faultCode: 'HARSH_BRAKING' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_right',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_right',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'Signal, head-check right, then ease in parallel to the curb and a controlled stop, feet down only when stopped.',
      },
    ],
  },

  /* =================================================================== */
  /* 4. Gilbert Road — HOV LANE TRAP (auto-fail scenario)                 */
  /* =================================================================== */
  {
    id: 'richmond-gilbert-hov-trap',
    name: 'Gilbert Road HOV Lane Trap',
    area: 'Richmond, BC',
    description:
      'The classic Richmond examiner trap: a right turn from Westminster Highway onto Gilbert Road, where the curb lane immediately becomes an HOV lane behind a solid white line. The correct procedure is NOT to enter the HOV lane — turn into the adjacent through lane instead.',
    difficulty: 'hard',
    estimatedMinutes: 8,
    tags: ['hov-trap', 'auto-fail', 'right-turn', 'lane-discipline', 'advanced'],
    steps: [
      {
        id: 'gil-1-approach',
        title: 'Approach Gilbert Road in the right lane',
        situation:
          'You are eastbound on Westminster Highway approaching Gilbert Road, where you will turn right (south). You are in the right-hand lane.',
        instruction:
          'Continue toward Gilbert Road in the right lane and prepare to turn right.',
        streetView: {
          location: '49.1690,-123.1430',
          heading: 90,
          label: 'Westminster Hwy approaching Gilbert Rd, facing east',
          fallbackScene: 'straight',
        },
        maneuver: 'straight',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'maintain_speed', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_FAST' },
          { action: 'lane_right', skill: 'space', order: 3, faultCode: 'IMPROPER_LANE_POSITION' },
        ],
        prohibited: [{ action: 'accelerate', faultCode: 'SPEED_TOO_FAST' }],
        hint: 'Set up early. Read the lane markings ahead on Gilbert Road before you arrive.',
      },
      {
        id: 'gil-2-read-signs',
        title: 'Read the lane markings on Gilbert Road',
        situation:
          'As you reach the corner you can see that the curb lane on Gilbert Road is a marked HOV / bus lane (diamond symbol) separated from the next lane by a SOLID white line. The lane to its left is the general through lane.',
        instruction:
          'Identify which lane you are allowed to enter. Do not commit to the turn until you know your target lane.',
        streetView: {
          location: '49.1688,-123.1428',
          heading: 135,
          label: 'Gilbert Rd HOV lane (diamond + solid white line), facing SE',
          fallbackScene: 'intersection',
        },
        maneuver: 'straight',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'brake', skill: 'speed', order: 2, faultCode: 'NO_SPEED_ADJUST_FOR_TURN' },
          { action: 'lane_left', skill: 'space', order: 3, faultCode: 'HOV_LANE_VIOLATION', critical: true },
        ],
        prohibited: [
          { action: 'lane_right', faultCode: 'HOV_LANE_VIOLATION' },
          { action: 'accelerate', faultCode: 'SPEED_TOO_FAST' },
        ],
        hint: 'A diamond symbol and a solid white line mean HOV only. Plan to turn into the general through lane to its LEFT, not the curb HOV lane.',
      },
      {
        id: 'gil-3-right-turn-trap',
        title: 'Turn right onto Gilbert Road — into the through lane',
        situation:
          'You are turning right onto southbound Gilbert Road. The tempting curb lane is HOV-only behind a solid white line. The correct move is to turn into the adjacent general-purpose through lane and NOT cross into or use the HOV lane.',
        instruction:
          'Turn right onto Gilbert Road, finishing in the general through lane — do NOT enter the HOV lane.',
        streetView: {
          location: '49.1687,-123.1427',
          heading: 180,
          label: 'Westminster Hwy & Gilbert Rd, turning south (HOV trap)',
          fallbackScene: 'intersection',
        },
        maneuver: 'right_turn',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_right', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_right',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'turn_right', skill: 'steering', order: 4, faultCode: 'WIDE_TURN' },
          { action: 'lane_left', skill: 'space', order: 5, faultCode: 'HOV_LANE_VIOLATION', critical: true },
          { action: 'signal_cancel', skill: 'communication', order: 6, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [
          { action: 'lane_right', faultCode: 'HOV_LANE_VIOLATION' },
          { action: 'merge', faultCode: 'CROSSED_SOLID_LINE' },
          { action: 'proceed', faultCode: 'FAILED_TO_YIELD' },
        ],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_right',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_right',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'THE TRAP: turn into the general lane, never the curb HOV lane. Entering the HOV lane or crossing the solid line is an automatic fail.',
      },
      {
        id: 'gil-4-merge-out',
        title: 'Continue south past the HOV lane termination',
        situation:
          'You are now established southbound in the general through lane. Ahead, the HOV lane ends and the solid line becomes a broken line where merging is permitted.',
        instruction:
          'Continue south, holding your lane, until lane changes are legally allowed again.',
        streetView: {
          location: '49.1665,-123.1427',
          heading: 180,
          label: 'Gilbert Rd south of Westminster Hwy, facing south',
          fallbackScene: 'straight',
        },
        maneuver: 'straight',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'maintain_speed', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_SLOW' },
          { action: 'lane_left', skill: 'space', order: 3, faultCode: 'IMPROPER_LANE_POSITION' },
        ],
        prohibited: [
          { action: 'lane_right', faultCode: 'CROSSED_SOLID_LINE' },
          { action: 'merge', faultCode: 'CROSSED_SOLID_LINE' },
        ],
        hint: 'Stay put while the line is solid. Only consider the curb lane once the line goes broken and the HOV restriction ends.',
      },
      {
        id: 'gil-5-lane-change',
        title: 'Lane change once permitted',
        situation:
          'The line is now broken and the lane to your right is a normal general-purpose lane. You may move over for a smoother line.',
        instruction:
          'If it is safe and now legal, change into the right lane.',
        streetView: {
          location: '49.1648,-123.1427',
          heading: 180,
          label: 'Gilbert Rd, broken line section, facing south',
          fallbackScene: 'straight',
        },
        maneuver: 'lane_change_right',
        speedZoneKph: 50,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_right', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_right',
            skill: 'observation',
            order: 3,
            faultCode: 'BLIND_SPOT_NOT_CHECKED',
            critical: true,
          },
          { action: 'lane_right', skill: 'space', order: 4, faultCode: 'IMPROPER_LANE_POSITION' },
          { action: 'signal_cancel', skill: 'communication', order: 5, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'merge', faultCode: 'UNSAFE_GAP_SELECTION' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_right',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_right',
            relativeTo: 'maneuver',
            faultCode: 'BLIND_SPOT_NOT_CHECKED',
          },
        ],
        hint: 'Now it is legal: mirror, signal, blind-spot check, move over, and cancel the signal.',
      },
    ],
  },

  /* =================================================================== */
  /* 5. No. 5 Road & Highway 99 on-ramp (merge practice)                  */
  /* =================================================================== */
  {
    id: 'richmond-no5-hwy99-merge',
    name: 'No. 5 Road & Hwy 99 Merge',
    area: 'Richmond, BC',
    description:
      'Advanced merging practice from No. 5 Road onto the Highway 99 on-ramp: an acceleration lane, a blind-spot-critical merge into faster traffic, and lane discipline at speed.',
    difficulty: 'hard',
    estimatedMinutes: 7,
    tags: ['highway', 'merge', 'on-ramp', 'advanced'],
    steps: [
      {
        id: 'no5-1-approach-ramp',
        title: 'Approach the Highway 99 on-ramp',
        situation:
          'You are southbound on No. 5 Road approaching the signed on-ramp to Highway 99. The signal ahead is green.',
        instruction: 'Continue toward the on-ramp and prepare to take it.',
        streetView: {
          location: '49.1450,-123.0850',
          heading: 180,
          label: 'No. 5 Rd approaching Hwy 99 on-ramp, facing south',
          fallbackScene: 'straight',
        },
        maneuver: 'straight',
        speedZoneKph: 60,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'maintain_speed', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_SLOW' },
          { action: 'lane_right', skill: 'space', order: 3, faultCode: 'IMPROPER_LANE_POSITION' },
        ],
        prohibited: [{ action: 'accelerate', faultCode: 'SPEED_TOO_FAST' }],
        hint: 'Position for the ramp early and keep your speed up so you can build to highway pace.',
      },
      {
        id: 'no5-2-enter-ramp',
        title: 'Take the on-ramp',
        situation:
          'You bear right onto the on-ramp. The ramp curves and then opens into an acceleration lane alongside the highway.',
        instruction:
          'Signal and take the on-ramp, then build speed in the acceleration lane.',
        streetView: {
          location: '49.1438,-123.0858',
          heading: 200,
          label: 'Hwy 99 on-ramp curve, facing SSW',
          fallbackScene: 'highway_onramp',
        },
        maneuver: 'right_turn',
        speedZoneKph: 60,
        expected: [
          { action: 'mirror_right', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_right', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_right',
            skill: 'observation',
            order: 3,
            faultCode: 'SHOULDER_CHECK_MISSED',
            critical: true,
          },
          { action: 'turn_right', skill: 'steering', order: 4, faultCode: 'WIDE_TURN' },
          { action: 'accelerate', skill: 'speed', order: 5, faultCode: 'SPEED_TOO_SLOW' },
          { action: 'signal_cancel', skill: 'communication', order: 6, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [{ action: 'brake', faultCode: 'NO_SPEED_ADJUST_FOR_TURN' }],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_right',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_right',
            relativeTo: 'maneuver',
            faultCode: 'SHOULDER_CHECK_MISSED',
          },
        ],
        hint: 'Take the ramp smoothly, then roll on the throttle to match highway speed before you merge.',
      },
      {
        id: 'no5-3-build-speed',
        title: 'Build speed in the acceleration lane',
        situation:
          'You are in the acceleration lane. Highway traffic to your left is moving around 80 km/h. You need to find a gap.',
        instruction:
          'Accelerate to match highway speed and pick a safe gap to merge into.',
        streetView: {
          location: '49.1425,-123.0865',
          heading: 200,
          label: 'Hwy 99 acceleration lane, facing SSW',
          fallbackScene: 'highway_onramp',
        },
        maneuver: 'straight',
        speedZoneKph: 80,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'accelerate', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_SLOW', critical: true },
          { action: 'maintain_speed', skill: 'speed', order: 3, faultCode: 'SPEED_TOO_SLOW' },
        ],
        prohibited: [
          { action: 'brake', faultCode: 'HARSH_BRAKING' },
          { action: 'stop', faultCode: 'UNSAFE_GAP_SELECTION' },
        ],
        hint: 'Match the speed of highway traffic before you move over — merging slow is dangerous and faulted.',
      },
      {
        id: 'no5-4-merge',
        title: 'Merge onto Highway 99',
        situation:
          'A gap has opened in the right-hand highway lane. This is your moment to merge — the blind spot is critical here.',
        instruction:
          'Merge left into the highway lane, checking your blind spot before you move.',
        streetView: {
          location: '49.1410,-123.0872',
          heading: 200,
          label: 'Merging onto Hwy 99 southbound',
          fallbackScene: 'highway_onramp',
        },
        maneuver: 'merge',
        speedZoneKph: 80,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'signal_left', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
          {
            action: 'shoulder_left',
            skill: 'observation',
            order: 3,
            faultCode: 'BLIND_SPOT_NOT_CHECKED',
            critical: true,
          },
          { action: 'merge', skill: 'space', order: 4, faultCode: 'UNSAFE_GAP_SELECTION' },
          { action: 'signal_cancel', skill: 'communication', order: 5, faultCode: 'SIGNAL_NOT_CANCELLED' },
        ],
        prohibited: [
          { action: 'stop', faultCode: 'DANGEROUS_ACTION' },
          { action: 'brake', faultCode: 'HARSH_BRAKING' },
        ],
        timing: [
          {
            kind: 'signal_before',
            action: 'signal_left',
            relativeTo: 'maneuver',
            minMs: 3000,
            faultCode: 'SIGNAL_TOO_LATE',
          },
          {
            kind: 'signal_cancel_after',
            action: 'signal_cancel',
            relativeTo: 'maneuver',
            maxMs: 3000,
            faultCode: 'SIGNAL_NOT_CANCELLED',
          },
          {
            kind: 'observation_before',
            action: 'shoulder_left',
            relativeTo: 'maneuver',
            faultCode: 'BLIND_SPOT_NOT_CHECKED',
          },
        ],
        hint: 'Signal, head-check the blind spot, merge smoothly into the gap at speed, then cancel.',
      },
      {
        id: 'no5-5-settle',
        title: 'Settle into the highway lane',
        situation:
          'You are now established on Highway 99 southbound. Traffic ahead is flowing well.',
        instruction:
          'Settle into your lane at highway speed and keep a safe following distance.',
        streetView: {
          location: '49.1380,-123.0885',
          heading: 200,
          label: 'Hwy 99 southbound, settled in lane',
          fallbackScene: 'straight',
        },
        maneuver: 'straight',
        speedZoneKph: 80,
        expected: [
          { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
          { action: 'maintain_speed', skill: 'speed', order: 2, faultCode: 'SPEED_TOO_FAST' },
          { action: 'lane_left', skill: 'space', order: 3, faultCode: 'IMPROPER_LANE_POSITION' },
        ],
        prohibited: [
          { action: 'accelerate', faultCode: 'SPEED_TOO_FAST' },
          { action: 'proceed', faultCode: 'FOLLOWING_TOO_CLOSE' },
        ],
        hint: 'Keep your speed legal and your following gap generous — at highway speed you need more space.',
      },
    ],
  },
];
