import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { MAX_SOURCES } from './SoundWaveShaderMaterial';

const vertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vLocalPosition = position;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform int u_numSources;
  uniform vec3 u_sourcePositions[${MAX_SOURCES}];
  uniform vec3 u_sourceDirections[${MAX_SOURCES}];
  uniform float u_frequencies[${MAX_SOURCES}];
  uniform float u_amplitudes[${MAX_SOURCES}];
  uniform float u_phases[${MAX_SOURCES}];
  uniform float u_directivity[${MAX_SOURCES}];

  uniform float u_time;
  uniform float u_speedOfSound;
  uniform bool u_steadyState;
  
  uniform vec3 u_boxMin;
  uniform vec3 u_boxMax;
  uniform float u_density;

  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  // Scientific heatmap
  vec3 heatmap(float v) {
      v = clamp(v, 0.0, 1.0);
      vec3 c0 = vec3(0.0, 0.0, 0.5); 
      vec3 c1 = vec3(0.0, 0.5, 1.0); 
      vec3 c2 = vec3(0.0, 1.0, 0.5); 
      vec3 c3 = vec3(1.0, 1.0, 0.0); 
      vec3 c4 = vec3(1.0, 0.0, 0.0); 

      if(v < 0.25) return mix(c0, c1, v * 4.0);
      if(v < 0.50) return mix(c1, c2, (v - 0.25) * 4.0);
      if(v < 0.75) return mix(c2, c3, (v - 0.50) * 4.0);
      return mix(c3, c4, (v - 0.75) * 4.0);
  }

  // Calculate bounding box intersection to find exit point
  vec2 intersectBox(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
      vec3 tMin = (boxMin - rayOrigin) / rayDir;
      vec3 tMax = (boxMax - rayOrigin) / rayDir;
      vec3 t1 = min(tMin, tMax);
      vec3 t2 = max(tMin, tMax);
      float tNear = max(max(t1.x, t1.y), t1.z);
      float tFar = min(min(t2.x, t2.y), t2.z);
      return vec2(tNear, tFar);
  }

  float getAmplitudeAt(vec3 pos) {
    float realPart = 0.0;
    float imagPart = 0.0;

    for (int i = 0; i < ${MAX_SOURCES}; i++) {
      if (i >= u_numSources) break;

      vec3 sPos = u_sourcePositions[i];
      float dist = distance(pos, sPos);
      dist = max(dist, 0.05);

      float k = (2.0 * 3.14159265359 * u_frequencies[i]) / u_speedOfSound;
      
      vec3 toPoint = normalize(pos - sPos);
      vec3 dir = u_sourceDirections[i];
      float cosTheta = dot(toPoint, dir);
      
      float directivity = u_directivity[i] + (1.0 - u_directivity[i]) * cosTheta;
      directivity = max(directivity, 0.0);

      float A = (u_amplitudes[i] * directivity) / dist;
      float phase = u_phases[i];
      
      float arg = -k * dist + phase;
      
      if (!u_steadyState) {
        float w = 2.0 * 3.14159265359 * u_frequencies[i];
        arg += w * u_time * 0.01; 
      }

      realPart += A * cos(arg);
      imagPart += A * sin(arg);
    }

    if (u_steadyState) {
      return sqrt(realPart * realPart + imagPart * imagPart) * 1.5; 
    } else {
      return (realPart * 1.5 + 1.0) * 0.5;
    }
  }

  void main() {
    vec3 rayDir = normalize(vWorldPosition - cameraPosition);
    vec3 rayOrigin = cameraPosition;
    
    // Check intersection with the room box
    vec2 tBox = intersectBox(rayOrigin, rayDir, u_boxMin, u_boxMax);
    
    // If the camera is inside the box, start from t=0
    float tNear = max(tBox.x, 0.0);
    float tFar = tBox.y;

    if (tNear > tFar) discard; // Missed the box

    // Raymarching loop
    int maxSteps = 40;
    float stepSize = (tFar - tNear) / float(maxSteps);
    
    vec3 colorAcc = vec3(0.0);
    float alphaAcc = 0.0;

    float t = tNear;
    for (int i = 0; i < 40; i++) {
      vec3 p = rayOrigin + rayDir * t;
      float amp = getAmplitudeAt(p);
      
      // Calculate opacity contribution based on amplitude
      // Nodes (amp ~ 0) should be transparent. Antinodes (amp high) more opaque.
      // u_density controls overall opacity scale.
      float opacity = smoothstep(0.1, 0.8, amp) * u_density;
      
      if (opacity > 0.01) {
        vec3 color = heatmap(amp);
        // Pre-multiplied alpha accumulation
        colorAcc += color * opacity * (1.0 - alphaAcc);
        alphaAcc += opacity * (1.0 - alphaAcc);
      }
      
      if (alphaAcc >= 0.95) break; // Early exit if opaque
      t += stepSize;
    }

    if (alphaAcc < 0.01) discard;

    gl_FragColor = vec4(colorAcc, alphaAcc);
  }
`;

export class VolumetricSoundMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.BackSide, // Render inside box correctly if camera enters it
      depthWrite: false, // Don't write to depth buffer to avoid occluding speakers incorrectly
      uniforms: {
        u_numSources: { value: 0 },
        u_sourcePositions: { value: Array.from({length: MAX_SOURCES}, () => new THREE.Vector3()) },
        u_sourceDirections: { value: Array.from({length: MAX_SOURCES}, () => new THREE.Vector3(0,0,-1)) },
        u_frequencies: { value: new Array(MAX_SOURCES).fill(0) },
        u_amplitudes: { value: new Array(MAX_SOURCES).fill(0) },
        u_phases: { value: new Array(MAX_SOURCES).fill(0) },
        u_directivity: { value: new Array(MAX_SOURCES).fill(1) },
        u_time: { value: 0 },
        u_speedOfSound: { value: 343.0 },
        u_steadyState: { value: true },
        u_boxMin: { value: new THREE.Vector3(-5, -2, -4) },
        u_boxMax: { value: new THREE.Vector3(5, 2, 4) },
        u_density: { value: 0.15 },
      },
    });
  }
}

extend({ VolumetricSoundMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      volumetricSoundMaterial: any;
    }
  }
}
