import React, { useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import type { ObstacleData } from '../types';

interface Obstacle3DProps {
  obstacle: ObstacleData;
  updateObstacle: (id: string, updates: Partial<ObstacleData>) => void;
  selected: boolean;
  onSelect: () => void;
}

export const Obstacle3D: React.FC<Obstacle3DProps> = ({ obstacle, updateObstacle, selected, onSelect }) => {
  const meshRef = useRef<any>(null);

  return (
    <>
      <mesh
        ref={meshRef}
        position={obstacle.position}
        rotation={obstacle.rotation}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {obstacle.shape === 'box' ? (
          <boxGeometry args={[obstacle.size[0], obstacle.size[1], obstacle.size[2]]} />
        ) : (
          <cylinderGeometry args={[obstacle.size[0], obstacle.size[0], obstacle.size[1], 24]} />
        )}
        <meshStandardMaterial
          color={selected ? '#6366f1' : '#475569'}
          transparent
          opacity={0.4}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {selected && (
        <TransformControls
          object={meshRef}
          mode="translate"
          onMouseUp={() => {
            if (meshRef.current) {
              const p = meshRef.current.position;
              const r = meshRef.current.rotation;
              updateObstacle(obstacle.id, {
                position: [p.x, p.y, p.z],
                rotation: [r.x, r.y, r.z]
              });
            }
          }}
        />
      )}
    </>
  );
};
