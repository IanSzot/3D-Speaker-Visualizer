import type { RoomData, SpeakerData, VirtualSource } from '../types';
import * as THREE from 'three';

// Generate virtual sources based on the 1st order Image Source Method
export function generateVirtualSources(speakers: SpeakerData[], room: RoomData): VirtualSource[] {
  const virtualSources: VirtualSource[] = [];

  // Half dimensions of the room
  const hW = room.width / 2;
  const hH = room.height / 2;
  const hD = room.depth / 2;

  // For 1st order reflections, we have the original + 6 reflections
  speakers.forEach(speaker => {
    const { position, rotation, frequency, amplitude, phase, type, delayMs = 0, invertPolarity = false } = speaker;
    const directivityFactor = type === 'omni' ? 1.0 : 0.5; // For cardioid, directivity factor = 0.5

    // Calculate effective phase shift due to delay and polarity
    // Delay = d (ms) -> phase shift = -2 * pi * f * (d / 1000)
    const delayPhaseShift = -2.0 * Math.PI * frequency * (delayMs / 1000.0);
    const polarityPhaseShift = invertPolarity ? Math.PI : 0.0;
    const effectivePhase = phase + delayPhaseShift + polarityPhaseShift;

    const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ');
    const direction = new THREE.Vector3(0, 0, -1).applyEuler(euler);

    // Helper to add a source
    const addSource = (pos: [number, number, number], ampMult: number) => {
      virtualSources.push({
        position: pos,
        direction: [direction.x, direction.y, direction.z],
        frequency,
        amplitude: amplitude * ampMult,
        phase: effectivePhase,
        directivityFactor
      });
    };

    // 0: Original source
    addSource([...position], 1.0);

    // 1st order reflections
    const reflAmp = 1.0 - room.absorption;
    
    // x walls (Left/Right)
    addSource([ hW + (hW - position[0]), position[1], position[2] ], reflAmp);
    addSource([ -hW - (hW + position[0]), position[1], position[2] ], reflAmp);
    
    // y walls (Floor/Ceiling)
    addSource([ position[0], hH + (hH - position[1]), position[2] ], reflAmp);
    addSource([ position[0], -hH - (hH + position[1]), position[2] ], reflAmp);
    
    // z walls (Front/Back)
    addSource([ position[0], position[1], hD + (hD - position[2]) ], reflAmp);
    addSource([ position[0], position[1], -hD - (hD + position[2]) ], reflAmp);
  });

  return virtualSources;
}
