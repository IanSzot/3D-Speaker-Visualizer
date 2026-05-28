import React from 'react';
import type { RoomData } from '../types';

export const Room3D: React.FC<{ room: RoomData }> = ({ room }) => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[room.width, room.height, room.depth]} />
      <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.15} />
    </mesh>
  );
};
