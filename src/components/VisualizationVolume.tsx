import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VirtualSource } from '../types';
import './VolumetricSoundMaterial'; 
import { MAX_SOURCES } from './SoundWaveShaderMaterial';

interface VisualizationVolumeProps {
  virtualSources: VirtualSource[];
  width: number;
  depth: number;
  height: number;
  steadyState: boolean;
  speedOfSound: number;
  density: number;
}

export const VisualizationVolume: React.FC<VisualizationVolumeProps> = ({
  virtualSources,
  width,
  depth,
  height,
  steadyState,
  speedOfSound,
  density
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
      
      mat.uniforms.u_density.value = density;
      
      mat.uniforms.u_boxMin.value.set(-width/2, -height/2, -depth/2);
      mat.uniforms.u_boxMax.value.set(width/2, height/2, depth/2);
    }
  });

  return (
    <mesh position={[0, 0, 0]}>
      {/* Slightly larger than the room to avoid clipping exactly on the walls */}
      <boxGeometry args={[width - 0.01, height - 0.01, depth - 0.01]} />
      <volumetricSoundMaterial ref={materialRef} />
    </mesh>
  );
};
