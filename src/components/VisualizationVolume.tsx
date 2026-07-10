import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VirtualSource, SimulationQuality, ObstacleData } from '../types';
import './VolumetricSoundMaterial'; 
import { MAX_SOURCES, MAX_OBSTACLES } from './SoundWaveShaderMaterial';

interface VisualizationVolumeProps {
  virtualSources: VirtualSource[];
  obstacles: ObstacleData[];
  width: number;
  depth: number;
  height: number;
  steadyState: boolean;
  speedOfSound: number;
  density: number;
  quality: SimulationQuality;
}

export const VisualizationVolume: React.FC<VisualizationVolumeProps> = ({
  virtualSources,
  obstacles,
  width,
  depth,
  height,
  steadyState,
  speedOfSound,
  density,
  quality
}) => {
  const materialRef = useRef<any>(null);

  const uniforms = useMemo(() => {
    return {
      positions: Array.from({length: MAX_SOURCES}, () => new THREE.Vector3()),
      directions: Array.from({length: MAX_SOURCES}, () => new THREE.Vector3(0,0,-1)),
      frequencies: new Array(MAX_SOURCES).fill(0),
      amplitudes: new Array(MAX_SOURCES).fill(0),
      phases: new Array(MAX_SOURCES).fill(0),
      directivity: new Array(MAX_SOURCES).fill(1),
      obstaclePositions: Array.from({length: MAX_OBSTACLES}, () => new THREE.Vector3()),
      obstacleRotations: Array.from({length: MAX_OBSTACLES}, () => new THREE.Vector3()),
      obstacleSizes: Array.from({length: MAX_OBSTACLES}, () => new THREE.Vector3(1,1,1)),
      obstacleShapes: new Array(MAX_OBSTACLES).fill(0),
    };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      const mat = materialRef.current;
      
      const numSources = Math.min(virtualSources.length, MAX_SOURCES);
      
      for (let i = 0; i < numSources; i++) {
        const src = virtualSources[i];
        uniforms.positions[i].set(...src.position);
        uniforms.directions[i].set(...src.direction);
        uniforms.frequencies[i] = src.frequency;
        uniforms.amplitudes[i] = src.amplitude;
        uniforms.phases[i] = src.phase;
        uniforms.directivity[i] = src.directivityFactor;
      }

      mat.uniforms.u_numSources.value = numSources;
      mat.uniforms.u_sourcePositions.value = uniforms.positions;
      mat.uniforms.u_sourceDirections.value = uniforms.directions;
      mat.uniforms.u_frequencies.value = uniforms.frequencies;
      mat.uniforms.u_amplitudes.value = uniforms.amplitudes;
      mat.uniforms.u_phases.value = uniforms.phases;
      mat.uniforms.u_directivity.value = uniforms.directivity;
      
      mat.uniforms.u_time.value = state.clock.elapsedTime;
      mat.uniforms.u_steadyState.value = steadyState;
      mat.uniforms.u_speedOfSound.value = speedOfSound;
      
      // Quality-based ray steps: Low=16, Medium=24, High=40
      let raySteps = 24;
      if (quality === 'low') raySteps = 16;
      if (quality === 'high') raySteps = 40;
      mat.uniforms.u_raySteps.value = raySteps;
      
      mat.uniforms.u_density.value = density;
      
      mat.uniforms.u_boxMin.value.set(-width/2, -height/2, -depth/2);
      mat.uniforms.u_boxMax.value.set(width/2, height/2, depth/2);

      // Obstacles
      const numObs = Math.min(obstacles.length, MAX_OBSTACLES);
      for (let i = 0; i < numObs; i++) {
        const obs = obstacles[i];
        uniforms.obstaclePositions[i].set(...obs.position);
        uniforms.obstacleRotations[i].set(...obs.rotation);
        uniforms.obstacleSizes[i].set(...obs.size);
        uniforms.obstacleShapes[i] = obs.shape === 'box' ? 0 : 1;
      }
      mat.uniforms.u_numObstacles.value = numObs;
      mat.uniforms.u_obstaclePositions.value = uniforms.obstaclePositions;
      mat.uniforms.u_obstacleRotations.value = uniforms.obstacleRotations;
      mat.uniforms.u_obstacleSizes.value = uniforms.obstacleSizes;
      mat.uniforms.u_obstacleShapes.value = uniforms.obstacleShapes;
    }
  });

  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[width - 0.01, height - 0.01, depth - 0.01]} />
      <volumetricSoundMaterial ref={materialRef} />
    </mesh>
  );
};
