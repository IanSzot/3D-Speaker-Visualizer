import type { RoomData, SpeakerGroupData, SimulationQuality, ObstacleData } from '../types';

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
    // encodeURIComponent handles UTF-8 properly so btoa doesn't crash on extended chars
    const base64 = btoa(encodeURIComponent(jsonString));
    window.history.replaceState(null, '', `#state=${base64}`);
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
    
    const base64 = hash.replace('#state=', '');
    const jsonString = decodeURIComponent(atob(base64));
    const state = JSON.parse(jsonString) as AppState;
    
    // Clear the hash after loading so it doesn't linger forever if they change things
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    
    return state;
  } catch (error) {
    console.error('Failed to decode state from URL:', error);
    return null;
  }
}
