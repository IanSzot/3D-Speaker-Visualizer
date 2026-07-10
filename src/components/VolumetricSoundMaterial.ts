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

  uniform int u_numObstacles;
  uniform vec3 u_obstaclePositions[${MAX_OBSTACLES}];
  uniform vec3 u_obstacleRotations[${MAX_OBSTACLES}];
  uniform vec3 u_obstacleSizes[${MAX_OBSTACLES}];
  uniform int u_obstacleShapes[${MAX_OBSTACLES}];

  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  vec3 rotateY(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  bool isPathBlocked(vec3 from, vec3 to) {
    vec3 seg = to - from;
    float segLen = length(seg);
    if (segLen < 0.001) return false;
    vec3 dir = seg / segLen;

    for (int i = 0; i < ${MAX_OBSTACLES}; i++) {
      if (i >= u_numObstacles) break;

      float angle = -u_obstacleRotations[i].y;
      vec3 localFrom = rotateY(from - u_obstaclePositions[i], angle);
      vec3 localDir = rotateY(dir, angle);
      vec3 halfSize = u_obstacleSizes[i] * 0.5;

      if (u_obstacleShapes[i] == 0) {
        vec3 invDir = 1.0 / localDir;
        vec3 t1 = (-halfSize - localFrom) * invDir;
        vec3 t2 = ( halfSize - localFrom) * invDir;
        vec3 tmin = min(t1, t2);
        vec3 tmax = max(t1, t2);
        float tNear = max(max(tmin.x, tmin.y), tmin.z);
        float tFar  = min(min(tmax.x, tmax.y), tmax.z);
        if (tNear < tFar && tFar > 0.05 && tNear < segLen - 0.05) {
          return true;
        }
      } else {
        float r = halfSize.x;
        float a = localDir.x * localDir.x + localDir.z * localDir.z;
        float b = 2.0 * (localFrom.x * localDir.x + localFrom.z * localDir.z);
        float c = localFrom.x * localFrom.x + localFrom.z * localFrom.z - r * r;
        float disc = b * b - 4.0 * a * c;
        if (disc >= 0.0 && a > 0.0001) {
          float sqrtDisc = sqrt(disc);
          float t0 = (-b - sqrtDisc) / (2.0 * a);
          float t1 = (-b + sqrtDisc) / (2.0 * a);
          for (int j = 0; j < 2; j++) {
            float t = (j == 0) ? t0 : t1;
            if (t > 0.05 && t < segLen - 0.05) {
              float y = localFrom.y + localDir.y * t;
              if (abs(y) < halfSize.y) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  bool isInsideObstacle(vec3 pos) {
    for (int i = 0; i < ${MAX_OBSTACLES}; i++) {
      if (i >= u_numObstacles) break;
      vec3 local = pos - u_obstaclePositions[i];
      local = rotateY(local, -u_obstacleRotations[i].y);
      vec3 halfSize = u_obstacleSizes[i] * 0.5;
      if (u_obstacleShapes[i] == 0) {
        if (abs(local.x) < halfSize.x && abs(local.y) < halfSize.y && abs(local.z) < halfSize.z) return true;
      } else {
        float r = halfSize.x;
        if (local.x * local.x + local.z * local.z < r * r && abs(local.y) < halfSize.y) return true;
      }
    }
    return false;
  }

  vec3 heatmap(float v) {
      v = clamp(v, 0.0, 1.0);
      vec3 c0 = vec3(0.0, 0.0, 0.5); 
      vec3 c1 = vec3(0.0, 0.5, 1.0); 
      vec3 c2 = vec3(0.0, 1.0, 0.5); 
      vec3 c3 = vec3(1.0, 1.0, 0.0); 
      vec3 c4 = vec3(1.0, 0.0, 0.0); 
      
      vec3 color = mix(c0, c1, smoothstep(0.0, 0.25, v));
      color = mix(color, c2, smoothstep(0.25, 0.50, v));
      color = mix(color, c3, smoothstep(0.50, 0.75, v));
      color = mix(color, c4, smoothstep(0.75, 1.0, v));
      return color;
  }

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
    if (isInsideObstacle(pos)) return 0.0;

    float realPart = 0.0;
    float imagPart = 0.0;

    for (int i = 0; i < ${MAX_SOURCES}; i++) {
      if (i >= u_numSources) break;

      vec3 sPos = u_sourcePositions[i];

      // Check line-of-sight: skip this source if blocked
      if (u_numObstacles > 0 && isPathBlocked(sPos, pos)) continue;

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
    
    vec2 tBox = intersectBox(rayOrigin, rayDir, u_boxMin, u_boxMax);
    float tNear = max(tBox.x, 0.0);
    float tFar = tBox.y;

    if (tNear > tFar) discard;

    float stepSize = (tFar - tNear) / float(u_raySteps);
    
    vec3 colorAcc = vec3(0.0);
    float alphaAcc = 0.0;

    float t = tNear;
    for (int i = 0; i < 40; i++) {
      if (i >= u_raySteps) break;
      vec3 p = rayOrigin + rayDir * t;
      float amp = getAmplitudeAt(p);
      
      float opacity = smoothstep(0.1, 0.8, amp) * u_density;
      
      if (opacity > 0.01) {
        vec3 color = heatmap(amp);
        colorAcc += color * opacity * (1.0 - alphaAcc);
        alphaAcc += opacity * (1.0 - alphaAcc);
      }
      
      if (alphaAcc >= 0.90) break;
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
