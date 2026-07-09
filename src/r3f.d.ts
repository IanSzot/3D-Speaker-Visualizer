import { Object3DNode } from '@react-three/fiber';
import { SoundWaveMaterial } from './components/SoundWaveShaderMaterial';
import { VolumetricSoundMaterial } from './components/VolumetricSoundMaterial';

declare module '@react-three/fiber' {
  interface ThreeElements {
    soundWaveMaterial: Object3DNode<SoundWaveMaterial, typeof SoundWaveMaterial>;
    volumetricSoundMaterial: Object3DNode<VolumetricSoundMaterial, typeof VolumetricSoundMaterial>;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      soundWaveMaterial: any;
      volumetricSoundMaterial: any;
    }
  }
}
