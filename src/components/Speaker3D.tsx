import React, { useRef } from 'react';
import * as THREE from 'three';
import type { SpeakerData } from '../types';

interface Speaker3DProps {
  speaker: SpeakerData;
}

export const Speaker3D: React.FC<Speaker3DProps> = ({ speaker }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Determine color based on speaker properties
  let color = '#3b82f6'; // Default blue for omni
  if (speaker.type === 'cardioid') color = '#a855f7'; // Purple for cardioid
  if (speaker.invertPolarity) color = '#ef4444'; // Red if inverted

  return (
    <group position={speaker.position} rotation={new THREE.Euler(...speaker.rotation)}>
      <mesh ref={meshRef} castShadow>
        {/* Main speaker box */}
        <boxGeometry args={[0.4, 0.6, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
        
        {/* Speaker cone visualization (front) */}
        <mesh position={[0, 0, -0.21]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        
        {/* Direction indicator for Cardioid */}
        {speaker.type === 'cardioid' && (
          <mesh position={[0, 0.35, -0.1]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.1, 0.2, 8]} />
            <meshStandardMaterial color="#fcd34d" />
          </mesh>
        )}
      </mesh>
    </group>
  );
};
