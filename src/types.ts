export type SpeakerType = 'omni' | 'cardioid';

export interface SpeakerData {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  frequency: number; // Hz, e.g., 20 - 20000
  amplitude: number; // 0.0 to 1.0
  type: SpeakerType;
  phase: number; // 0 to 2PI
  delayMs?: number; // Delay in milliseconds
  invertPolarity?: boolean; // Flip phase by 180 degrees
}

export interface SpeakerGroupData {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  speakers: SpeakerData[];
}

export interface RoomData {
  width: number;
  height: number;
  depth: number;
  absorption: number; // 0.0 to 1.0
}

// For the shader, we need virtual sources representing the reflections
export type SimulationQuality = 'low' | 'medium' | 'high';

export interface VirtualSource {
  position: [number, number, number];
  direction: [number, number, number]; // Forward vector for directivity
  frequency: number;
  amplitude: number;
  phase: number;
  directivityFactor: number; // 1.0 for omni, 0.5 for cardioid
}
