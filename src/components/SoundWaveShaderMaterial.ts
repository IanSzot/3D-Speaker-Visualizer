import * as THREE from 'three';
import { extend } from '@react-three/fiber';

export const MAX_SOURCES = 70;
export const MAX_OBSTACLES = 8;

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

  // Obstacle uniforms
  uniform int u_numObstacles;
  uniform vec3 u_obstaclePositions[${MAX_OBSTACLES}];
  uniform vec3 u_obstacleRotations[${MAX_OBSTACLES}];
  uniform vec3 u_obstacleSizes[${MAX_OBSTACLES}];
  uniform int u_obstacleShapes[${MAX_OBSTACLES}]; // 0 = box, 1 = cylinder

  varying vec3 vWorldPosition;

  // Rotate a point around Y axis
  vec3 rotateY(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  bool isInsideObstacle(vec3 pos) {
    for (int i = 0; i < ${MAX_OBSTACLES}; i++) {
      if (i >= u_numObstacles) break;
      // Transform point into obstacle local space
      vec3 local = pos - u_obstaclePositions[i];
      local = rotateY(local, -u_obstacleRotations[i].y);
      vec3 halfSize = u_obstacleSizes[i] * 0.5;

      if (u_obstacleShapes[i] == 0) {
        // Box
        if (abs(local.x) < halfSize.x && abs(local.y) < halfSize.y && abs(local.z) < halfSize.z) {
          return true;
        }
      } else {
        // Cylinder: halfSize.x = radius, halfSize.y = half height
        float r = halfSize.x;
        if (local.x * local.x + local.z * local.z < r * r && abs(local.y) < halfSize.y) {
          return true;
        }
      }
    }
    return false;
  }

  // colormap
  vec3 heatmap(float v) {
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
    // Check if this point is inside an obstacle
    if (isInsideObstacle(vWorldPosition)) {
      gl_FragColor = vec4(0.15, 0.15, 0.2, 0.9);
      return;
    }

    float realPart = 0.0;
    float imagPart = 0.0;

    for (int i = 0; i < ${MAX_SOURCES}; i++) {
      if (i >= u_numSources) break;

      vec3 pos = u_sourcePositions[i];
      float dist = distance(vWorldPosition, pos);
      dist = max(dist, 0.05);

      float k = (6.28318530718 * u_frequencies[i]) / u_speedOfSound;
      
      // Directivity
      vec3 toPoint = normalize(vWorldPosition - pos);
      vec3 dir = u_sourceDirections[i];
      float cosTheta = dot(toPoint, dir);
      
      float directivity = u_directivity[i] + (1.0 - u_directivity[i]) * cosTheta;
      directivity = max(directivity, 0.0);

      float A = (u_amplitudes[i] * directivity) / dist;
      float phase = u_phases[i];

      float arg = -k * dist + phase;
      
      if (!u_steadyState) {
        float w = 6.28318530718 * u_frequencies[i];
        arg += w * u_time * 0.01;
      }

      realPart += A * cos(arg);
      imagPart += A * sin(arg);
    }

    float magnitude;
    if (u_steadyState) {
      magnitude = sqrt(realPart * realPart + imagPart * imagPart) * 1.5; 
    } else {
      magnitude = abs(realPart) * 1.5;
    }

    vec3 color = heatmap(magnitude);
    
    // Add grid lines for reference (1m grid)
    vec2 grid = fract(vWorldPosition.xz);
    if (grid.x < 0.02 || grid.y < 0.02) {
      color += vec3(0.1);
    }

    gl_FragColor = vec4(color, 0.85);
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
        // Obstacles
        u_numObstacles: { value: 0 },
        u_obstaclePositions: { value: Array.from({length: MAX_OBSTACLES}, () => new THREE.Vector3()) },
        u_obstacleRotations: { value: Array.from({length: MAX_OBSTACLES}, () => new THREE.Vector3()) },
        u_obstacleSizes: { value: Array.from({length: MAX_OBSTACLES}, () => new THREE.Vector3(1,1,1)) },
        u_obstacleShapes: { value: new Array(MAX_OBSTACLES).fill(0) },
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
