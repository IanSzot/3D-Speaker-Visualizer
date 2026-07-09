import React, { useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
// import { useThree } from '@react-three/fiber';
import type { SpeakerGroupData } from '../types';
import { Speaker3D } from './Speaker3D';

interface Group3DProps {
  group: SpeakerGroupData;
  updateGroup: (id: string, updates: Partial<SpeakerGroupData>) => void;
  selected: boolean;
  onSelect: () => void;
}

export const Group3D: React.FC<Group3DProps> = ({ group, updateGroup, selected, onSelect }) => {
  const groupRef = useRef<any>(null);
  const transformRef = useRef<any>(null);
  const [mode] = useState<'translate' | 'rotate'>('translate');

  return (
    <>
      <group 
        ref={groupRef}
        position={group.position} 
        rotation={group.rotation}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {group.speakers.map(speaker => (
          <Speaker3D key={speaker.id} speaker={speaker} />
        ))}
        
        {/* Visual bounding box or center marker could go here */}
        {selected && group.speakers.length > 1 && (
          <mesh visible={false}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        )}
      </group>

      {selected && (
        <TransformControls
          ref={transformRef}
          object={groupRef}
          mode={mode}
          onMouseUp={() => {
            if (groupRef.current) {
              const p = groupRef.current.position;
              const r = groupRef.current.rotation;
              updateGroup(group.id, {
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
