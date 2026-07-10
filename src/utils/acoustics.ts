import type { RoomData, SpeakerData, VirtualSource, SimulationQuality, ObstacleData } from '../types';
import { MAX_SOURCES } from '../components/SoundWaveShaderMaterial';
import * as THREE from 'three';

// Generate virtual sources based on the 1st order Image Source Method
export function generateVirtualSources(
  speakers: SpeakerData[], 
  room: RoomData, 
  quality: SimulationQuality = 'medium',
  obstacles: ObstacleData[] = [],
  roomReflectionsEnabled: boolean = true
): VirtualSource[] {
  const virtualSources: VirtualSource[] = [];

  // Half dimensions of the room
  const hW = room.width / 2;
  const hH = room.height / 2;
  const hD = room.depth / 2;

  speakers.forEach(speaker => {
    const { position, rotation, frequency, amplitude, phase, type, delayMs = 0, invertPolarity = false } = speaker;
    const directivityFactor = type === 'omni' ? 1.0 : 0.5;

    const delayPhaseShift = -2.0 * Math.PI * frequency * (delayMs / 1000.0);
    const polarityPhaseShift = invertPolarity ? Math.PI : 0.0;
    const effectivePhase = phase + delayPhaseShift + polarityPhaseShift;

    const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ');
    const direction = new THREE.Vector3(0, 0, -1).applyEuler(euler);
    const posVec = new THREE.Vector3(...position);

    const addSource = (pos: [number, number, number], dir: [number, number, number], ampMult: number) => {
      virtualSources.push({
        position: pos,
        direction: dir,
        frequency,
        amplitude: amplitude * ampMult,
        phase: effectivePhase,
        directivityFactor
      });
    };

    // 0: Original source
    addSource([...position], [direction.x, direction.y, direction.z], 1.0);

    // If quality is low, don't generate any reflections
    if (quality === 'low') return;

    const reflAmp = 1.0 - room.absorption;

    // --- Room Walls ---
    if (roomReflectionsEnabled) {
      addSource([ hW + (hW - position[0]), position[1], position[2] ], [-direction.x, direction.y, direction.z], reflAmp);
      addSource([ -hW - (hW + position[0]), position[1], position[2] ], [-direction.x, direction.y, direction.z], reflAmp);
      addSource([ position[0], hH + (hH - position[1]), position[2] ], [direction.x, -direction.y, direction.z], reflAmp);
      addSource([ position[0], -hH - (hH + position[1]), position[2] ], [direction.x, -direction.y, direction.z], reflAmp);
      addSource([ position[0], position[1], hD + (hD - position[2]) ], [direction.x, direction.y, -direction.z], reflAmp);
      addSource([ position[0], position[1], -hD - (hD + position[2]) ], [direction.x, direction.y, -direction.z], reflAmp);
    }

    // --- Object Reflections ---
    obstacles.forEach(obs => {
      const obsPos = new THREE.Vector3(...obs.position);
      const angle = obs.rotation[1];
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      const hs = new THREE.Vector3(obs.size[0]/2, obs.size[1]/2, obs.size[2]/2);

      if (obs.shape === 'box') {
        // Normals rotated by Y-axis
        const planes = [
          { n: new THREE.Vector3(cosA, 0, -sinA), p: new THREE.Vector3(hs.x, 0, 0) },   // +X Right
          { n: new THREE.Vector3(-cosA, 0, sinA), p: new THREE.Vector3(-hs.x, 0, 0) },  // -X Left
          { n: new THREE.Vector3(0, 1, 0),        p: new THREE.Vector3(0, hs.y, 0) },   // +Y Top
          { n: new THREE.Vector3(0, -1, 0),       p: new THREE.Vector3(0, -hs.y, 0) },  // -Y Bottom
          { n: new THREE.Vector3(sinA, 0, cosA),  p: new THREE.Vector3(0, 0, hs.z) },   // +Z Front
          { n: new THREE.Vector3(-sinA, 0, -cosA),p: new THREE.Vector3(0, 0, -hs.z) }   // -Z Back
        ];

        planes.forEach(plane => {
          // Transform plane point to world space
          const worldP = new THREE.Vector3(
            plane.p.x * cosA + plane.p.z * sinA,
            plane.p.y,
            -plane.p.x * sinA + plane.p.z * cosA
          ).add(obsPos);

          const toSpeaker = new THREE.Vector3().subVectors(posVec, worldP);
          const dist = toSpeaker.dot(plane.n);

          // If speaker is in front of the face
          if (dist > 0) {
            const reflectedPos = new THREE.Vector3().copy(posVec).sub(plane.n.clone().multiplyScalar(2 * dist));
            const reflectedDir = new THREE.Vector3().copy(direction).sub(plane.n.clone().multiplyScalar(2 * direction.dot(plane.n)));
            addSource([reflectedPos.x, reflectedPos.y, reflectedPos.z], [reflectedDir.x, reflectedDir.y, reflectedDir.z], reflAmp);
          }
        });
      } else if (obs.shape === 'cylinder') {
        // Top and Bottom planes
        const planes = [
          { n: new THREE.Vector3(0, 1, 0),  p: new THREE.Vector3(0, hs.y, 0) },
          { n: new THREE.Vector3(0, -1, 0), p: new THREE.Vector3(0, -hs.y, 0) }
        ];
        planes.forEach(plane => {
          const worldP = new THREE.Vector3().copy(plane.p).add(obsPos);
          const toSpeaker = new THREE.Vector3().subVectors(posVec, worldP);
          const dist = toSpeaker.dot(plane.n);
          if (dist > 0) {
            const reflectedPos = new THREE.Vector3().copy(posVec).sub(plane.n.clone().multiplyScalar(2 * dist));
            const reflectedDir = new THREE.Vector3().copy(direction).sub(plane.n.clone().multiplyScalar(2 * direction.dot(plane.n)));
            addSource([reflectedPos.x, reflectedPos.y, reflectedPos.z], [reflectedDir.x, reflectedDir.y, reflectedDir.z], reflAmp);
          }
        });

        // Curved surface - Locally flat approximation
        const dx = posVec.x - obsPos.x;
        const dz = posVec.z - obsPos.z;
        const distToAxis = Math.sqrt(dx*dx + dz*dz);
        const r = hs.x; // radius
        
        if (distToAxis > r) {
          // Normal pointing from cylinder axis directly towards the speaker
          const nx = dx / distToAxis;
          const nz = dz / distToAxis;
          const n = new THREE.Vector3(nx, 0, nz);
          
          // Point on surface closest to speaker
          const p = new THREE.Vector3(obsPos.x + nx * r, posVec.y, obsPos.z + nz * r);
          
          const toSpeaker = new THREE.Vector3().subVectors(posVec, p);
          const dist = toSpeaker.dot(n);
          
          if (dist > 0) {
            const reflectedPos = new THREE.Vector3().copy(posVec).sub(n.clone().multiplyScalar(2 * dist));
            const reflectedDir = new THREE.Vector3().copy(direction).sub(n.clone().multiplyScalar(2 * direction.dot(n)));
            addSource([reflectedPos.x, reflectedPos.y, reflectedPos.z], [reflectedDir.x, reflectedDir.y, reflectedDir.z], reflAmp);
          }
        }
      }
    });
  });

  // Sort by highest amplitude first to prioritize the most important sources if we hit the limit
  virtualSources.sort((a, b) => b.amplitude - a.amplitude);

  // Return only up to the quality-appropriate limit to prevent shader uniform overflow
  const limit = quality === 'high' ? MAX_SOURCES : quality === 'medium' ? 50 : 30;
  return virtualSources.slice(0, limit);
}
