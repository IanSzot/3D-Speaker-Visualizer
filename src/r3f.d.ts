import type { Object3DNode } from '@react-three/fiber';
import type { SoundWaveMaterial } from './components/SoundWaveShaderMaterial';
import type { VolumetricSoundMaterial } from './components/VolumetricSoundMaterial';

declare module '@react-three/fiber' {
  interface ThreeElements {
    soundWaveMaterial: Object3DNode<SoundWaveMaterial, typeof SoundWaveMaterial>;
    volumetricSoundMaterial: Object3DNode<VolumetricSoundMaterial, typeof VolumetricSoundMaterial>;
  }
}
