import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { MAX_SOURCES, MAX_OBSTACLES } from './SoundWaveShaderMaterial';

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
  uniform int u_raySteps;
  
  uniform vec3 u_boxMin;
  uniform vec3 u_boxMax;
  uniform float u_density;

  // Obstacle uniforms
  uniform int u_numObstacles;
  uniform vec3 u_obstaclePositions[${MAX_OBSTACLES}];
  uniform vec3 u_obstacleRotations[${MAX_OBSTACLES}];
  uniform vec3 u_obstacleSizes[${MAX_OBSTACLES}];
  uniform int u_obstacleShapes[${MAX_OBSTACLES}]; // 0 = box, 1 = cylinder

  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  // Rotate a point around Y axis
  vec3 rotateY(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  bool isInsideObstacle(vec3 pos) {
    for (int i = 0; i < ${MAX_OBSTACLES}; i++) {
      if (i >= u_numObstacles) break;
      vec3 local = pos - u_obstaclePositions[i];
      local = rotateY(local, -u_obstacleRotations[i].y);
      vec3 halfSize = u_obstacleSizes[i] * 0.5;

      if (u_obstacleShapes[i] == 0) {
        if (abs(local.x) < halfSize.x && abs(local.y) < halfSize.y && abs(local.z) < halfSize.z) {
          return true;
        }
      } else {
        float r = halfSize.x;
        if (local.x * local.x + local.z * local.z < r * r && abs(local.y) < halfSize.y) {
          return true;
        }
      }
    }
    return false;
  }

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
    // If inside an obstacle, return 0 (acoustic shadow)
    if (isInsideObstacle(pos)) return 0.0;

    float realPart = 0.0;
    float imagPart = 0.0;

    for (int i = 0; i < ${MAX_SOURCES}; i++) {
      if (i >= u_numSources) break;

      vec3 sPos = u_sourcePositions[i];
      float dist = distance(pos, sPos);
      dist = max(dist, 0.05);

      float k = (6.28318530718 * u_frequencies[i]) / u_speedOfSound;
      
      vec3 toPoint = normalize(pos - sPos);
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

    if (u_steadyState) {
      return sqrt(realPart * realPart + imagPart * imagPart) * 1.5; 
    } else {
      return abs(realPart) * 1.5;
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
    float stepSize = (tFar - tNear) / float(u_raySteps);
    
    vec3 colorAcc = vec3(0.0);
    float alphaAcc = 0.0;

    float t = tNear;
    for (int i = 0; i < 40; i++) {
      if (i >= u_raySteps) break;
      vec3 p = rayOrigin + rayDir * t;
      float amp = getAmplitudeAt(p);
      
      // Nodes (amp ~ 0) should be transparent. Antinodes (amp high) more opaque.
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
      side: THREE.BackSide,
      depthWrite: false,
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
        u_raySteps: { value: 24 },
        u_boxMin: { value: new THREE.Vector3(-5, -2, -4) },
        u_boxMax: { value: new THREE.Vector3(5, 2, 4) },
        u_density: { value: 0.15 },
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

extend({ VolumetricSoundMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      volumetricSoundMaterial: any;
    }
  }
}
