import * as THREE from 'three';
import { extend } from '@react-three/fiber';

export const MAX_SOURCES = 50;

const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
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
  uniform float u_directivity[${MAX_SOURCES}]; // 1.0 = omni, 0.5 = cardioid

  uniform float u_time;
  uniform float u_speedOfSound;
  uniform bool u_steadyState;

  varying vec3 vWorldPosition;

  // colormap
  vec3 heatmap(float v) {
      // Map v (amplitude) to a color
      // Scientific heatmap: blue (node) -> cyan -> green -> yellow -> red (antinode)
      // v goes from 0.0 to 1.0 typically, but can be larger.
      v = clamp(v, 0.0, 1.0);
      
      vec3 c0 = vec3(0.0, 0.0, 0.5); // dark blue
      vec3 c1 = vec3(0.0, 0.5, 1.0); // light blue
      vec3 c2 = vec3(0.0, 1.0, 0.5); // green
      vec3 c3 = vec3(1.0, 1.0, 0.0); // yellow
      vec3 c4 = vec3(1.0, 0.0, 0.0); // red

      if(v < 0.25) return mix(c0, c1, v * 4.0);
      if(v < 0.50) return mix(c1, c2, (v - 0.25) * 4.0);
      if(v < 0.75) return mix(c2, c3, (v - 0.50) * 4.0);
      return mix(c3, c4, (v - 0.75) * 4.0);
  }

  void main() {
    float realPart = 0.0;
    float imagPart = 0.0;

    for (int i = 0; i < ${MAX_SOURCES}; i++) {
      if (i >= u_numSources) break;

      vec3 pos = u_sourcePositions[i];
      float dist = distance(vWorldPosition, pos);
      
      // Avoid division by zero very close to the source
      dist = max(dist, 0.05);

      float k = (2.0 * 3.14159265359 * u_frequencies[i]) / u_speedOfSound;
      
      // Directivity
      vec3 toPoint = normalize(vWorldPosition - pos);
      vec3 dir = u_sourceDirections[i];
      float cosTheta = dot(toPoint, dir);
      
      // Directivity factor: a + (1-a)*cosTheta. If a=1, it's 1 (omni). If a=0.5, it's cardioid.
      float directivity = u_directivity[i] + (1.0 - u_directivity[i]) * cosTheta;
      directivity = max(directivity, 0.0); // no negative emission backwards for cardioid

      float A = (u_amplitudes[i] * directivity) / dist;
      
      float phase = u_phases[i];
      
      // We want to sum the complex pressures
      // P = A * e^( j * (wt - k*r + phase) )
      // We can drop wt for steady-state magnitude.
      // If we want moving waves, we include wt.

      float arg = -k * dist + phase;
      
      if (!u_steadyState) {
        float w = 2.0 * 3.14159265359 * u_frequencies[i];
        arg += w * u_time * 0.01; // slow down time a bit for visualization
      }

      realPart += A * cos(arg);
      imagPart += A * sin(arg);
    }

    float magnitude;
    if (u_steadyState) {
      magnitude = sqrt(realPart * realPart + imagPart * imagPart);
      // Scale magnitude for better visualization
      magnitude *= 1.5; 
    } else {
      magnitude = realPart; // just show the moving wavefronts
      // Map from [-val, val] to [0, 1]
      magnitude = (magnitude * 1.5 + 1.0) * 0.5;
    }

    vec3 color = heatmap(magnitude);
    
    // Add grid lines for reference (1m grid)
    vec2 grid = fract(vWorldPosition.xz);
    if (grid.x < 0.02 || grid.y < 0.02) {
      color += vec3(0.1); // subtle grid
    }

    gl_FragColor = vec4(color, 0.85); // slight transparency
  }
`;

export class SoundWaveMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
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
      },
    });
  }
}

// Register material so we can use it as <soundWaveMaterial /> in React Three Fiber
extend({ SoundWaveMaterial });

// Add TypeScript definition for the intrinsic element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      soundWaveMaterial: any;
    }
  }
}
