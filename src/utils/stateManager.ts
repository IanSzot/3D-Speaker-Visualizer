import type { RoomData, SpeakerGroupData, SimulationQuality, ObstacleData } from '../types';
import LZString from 'lz-string';

export interface AppState {
  room: RoomData;
  speakerGroups: SpeakerGroupData[];
  obstacles: ObstacleData[];
  steadyState: boolean;
  visMode: 'single-plane' | '3-planes' | 'volumetric';
  volumetricDensity: number;
  planeY: number;
  freqFilterEnabled: boolean;
  freqFilterTarget: number;
  freqFilterBandwidth: number;
  quality: SimulationQuality;
  roomReflections: boolean;
}

export function encodeStateToURL(state: AppState): void {
  try {
    const jsonString = JSON.stringify(state);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    window.history.replaceState(null, '', `#state=${compressed}`);
  } catch (error) {
    console.error('Failed to encode state to URL:', error);
  }
}

export function decodeStateFromURL(): AppState | null {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#state=')) {
      return null;
    }
    
    const compressed = hash.replace('#state=', '');
    const jsonString = LZString.decompressFromEncodedURIComponent(compressed);
    
    if (!jsonString) return null;
    
    const state = JSON.parse(jsonString) as AppState;
    
    // Clear the hash after loading so it doesn't linger forever if they change things
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    
    return state;
  } catch (error) {
    console.error('Failed to decode state from URL:', error);
    return null;
  }
}
