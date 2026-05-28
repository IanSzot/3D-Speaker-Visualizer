import { v4 as uuidv4 } from 'uuid';
import type { SpeakerData, SpeakerGroupData } from '../types';

export function generateLineArray(basePosition: [number, number, number], splayAngleDeg: number): SpeakerGroupData {
  const speakers: SpeakerData[] = [];
  const count = 8;
  const spacing = 0.3; // meters between boxes
  
  let currentY = 0;
  let currentZ = 0;
  let currentAngleDeg = 0;

  for (let i = 0; i < count; i++) {
    const angleRad = currentAngleDeg * (Math.PI / 180);
    
    speakers.push({
      id: uuidv4(),
      position: [0, currentY, currentZ],
      // rotation in Three.js is [X, Y, Z]. Pitching down is rotating around X axis.
      rotation: [-angleRad, 0, 0],
      frequency: 1000,
      amplitude: 1.0,
      type: 'cardioid', // Line arrays are usually directional
      phase: 0,
      delayMs: 0,
      invertPolarity: false
    });

    // Calculate next box position based on the physical curve
    // The next box is 'spacing' meters away, angled by currentAngleDeg + splayAngleDeg
    currentAngleDeg += splayAngleDeg;
    const nextAngleRad = currentAngleDeg * (Math.PI / 180);
    
    currentY -= spacing * Math.cos(nextAngleRad);
    currentZ += spacing * Math.sin(nextAngleRad); // moves forward (or backward depending on sign)
  }

  return {
    id: uuidv4(),
    name: 'Line Array',
    position: basePosition,
    rotation: [0, 0, 0],
    speakers
  };
}

export function generateEndfireArray(basePosition: [number, number, number]): SpeakerGroupData {
  const speakers: SpeakerData[] = [];
  const count = 4;
  const spacing = 1.0; // 1 meter spacing (approx 1/4 wavelength of 85Hz)
  const speedOfSound = 343.0;

  // Endfire: Rearmost fires first (0 delay). Frontmost fires last.
  // Assume forward is negative Z. 
  // Relative to group center
  const startZ = ((count - 1) * spacing) / 2;

  for (let i = 0; i < count; i++) {
    // i=0 is rear, i=3 is front
    const zPos = startZ - i * spacing;
    
    // Distance from rear = i * spacing.
    // Time for sound to travel this distance = (i * spacing) / c
    const delayMs = ((i * spacing) / speedOfSound) * 1000;

    speakers.push({
      id: uuidv4(),
      position: [0, 0, zPos],
      rotation: [0, 0, 0],
      frequency: 85,
      amplitude: 1.0,
      type: 'omni', // Endfire uses omni subs to create cardioid pattern
      phase: 0,
      delayMs: parseFloat(delayMs.toFixed(2)),
      invertPolarity: false
    });
  }

  return {
    id: uuidv4(),
    name: 'Endfire Sub Array',
    position: basePosition,
    rotation: [0, 0, 0],
    speakers
  };
}

export function generateArcDelayArray(basePosition: [number, number, number]): SpeakerGroupData {
  const speakers: SpeakerData[] = [];
  const count = 7;
  const spacing = 1.0;
  const speedOfSound = 343.0;
  const radius = 10.0; // 10 meter simulated physical radius

  const startX = -Math.floor(count / 2) * spacing;

  // First calculate max delta Z so we can anchor the outer speakers to 0ms delay
  const maxAbsX = Math.floor(count / 2) * spacing;
  const maxDeltaZ = radius - Math.sqrt(radius * radius - maxAbsX * maxAbsX);

  for (let i = 0; i < count; i++) {
    const xPos = startX + i * spacing;
    
    // Physical depth at this x position for a physical arc
    const deltaZ = radius - Math.sqrt(radius * radius - xPos * xPos);
    
    // Electronic delay to simulate being pushed back to deltaZ
    // Outer speakers (high deltaZ) fire earlier (0 delay).
    // Center speakers (deltaZ = 0) fire later.
    const delayDist = maxDeltaZ - deltaZ;
    const delayMs = (delayDist / speedOfSound) * 1000;

    speakers.push({
      id: uuidv4(),
      position: [xPos, 0, 0],
      rotation: [0, 0, 0],
      frequency: 60,
      amplitude: 1.0,
      type: 'omni',
      phase: 0,
      delayMs: parseFloat(delayMs.toFixed(2)),
      invertPolarity: false
    });
  }

  return {
    id: uuidv4(),
    name: 'Arc Delay Sub Array',
    position: basePosition,
    rotation: [0, 0, 0],
    speakers
  };
}
