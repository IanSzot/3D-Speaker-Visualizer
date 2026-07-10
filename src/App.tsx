import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

import type { SpeakerGroupData, RoomData, SpeakerData, SimulationQuality, ObstacleData, ObstacleShape } from './types';
import type { GlobalEnvironment } from './utils/presets';
import { generateVirtualSources } from './utils/acoustics';
import { decodeStateFromURL, encodeStateToURL } from './utils/stateManager';
import { Room3D } from './components/Room3D';
import { Group3D } from './components/Group3D';
import { Obstacle3D } from './components/Obstacle3D';
import { VisualizationPlane } from './components/VisualizationPlane';
import { VisualizationVolume } from './components/VisualizationVolume';
import { UIOverlay } from './components/UIOverlay';

function App() {
  const [room, setRoom] = useState<RoomData>({
    width: 10,
    height: 4,
    depth: 10,
    absorption: 0.1
  });
  
  const [speakerGroups, setSpeakerGroups] = useState<SpeakerGroupData[]>([
    {
      id: uuidv4(),
      name: 'Main Stereo',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      speakers: [
        {
          id: uuidv4(),
          position: [-2, 0, 0],
          rotation: [0, 0, 0],
          frequency: 200,
          amplitude: 1.0,
          type: 'omni',
          phase: 0,
          delayMs: 0,
          invertPolarity: false
        },
        {
          id: uuidv4(),
          position: [2, 0, 0],
          rotation: [0, 0, 0],
          frequency: 200,
          amplitude: 1.0,
          type: 'omni',
          phase: 0,
          delayMs: 0,
          invertPolarity: false
        }
      ]
    }
  ]);
  
  const [obstacles, setObstacles] = useState<ObstacleData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [steadyState, setSteadyState] = useState(true);
  const [visMode, setVisMode] = useState<'single-plane' | '3-planes' | 'volumetric'>('volumetric');
  const [volumetricDensity, setVolumetricDensity] = useState(0.15);
  const [planeY, setPlaneY] = useState(0);

  // Frequency Filter State
  const [freqFilterEnabled, setFreqFilterEnabled] = useState(false);
  const [freqFilterTarget, setFreqFilterTarget] = useState(60);
  const [freqFilterBandwidth, setFreqFilterBandwidth] = useState(5);
  
  const [quality, setQuality] = useState<SimulationQuality>('medium');
  const [roomReflections, setRoomReflections] = useState(true);

  useEffect(() => {
    const savedState = decodeStateFromURL();
    if (savedState) {
      setRoom(savedState.room);
      setSpeakerGroups(savedState.speakerGroups);
      setObstacles(savedState.obstacles || []);
      setSteadyState(savedState.steadyState);
      setVisMode(savedState.visMode);
      setVolumetricDensity(savedState.volumetricDensity);
      setPlaneY(savedState.planeY);
      setFreqFilterEnabled(savedState.freqFilterEnabled);
      setFreqFilterTarget(savedState.freqFilterTarget);
      setFreqFilterBandwidth(savedState.freqFilterBandwidth);
      setQuality(savedState.quality || 'medium');
      if (savedState.roomReflections !== undefined) setRoomReflections(savedState.roomReflections);
    }
  }, []);

  const handleShareState = () => {
    encodeStateToURL({
      room, speakerGroups, obstacles, steadyState, visMode, volumetricDensity, planeY,
      freqFilterEnabled, freqFilterTarget, freqFilterBandwidth, quality, roomReflections
    });
    navigator.clipboard.writeText(window.location.href);
  };

  const virtualSources = useMemo(() => {
    const globalSpeakers: SpeakerData[] = [];
    
    speakerGroups.forEach(group => {
      const groupMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(...group.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...group.rotation)),
        new THREE.Vector3(1, 1, 1)
      );

      group.speakers.forEach(speaker => {
        // Filter by frequency before generating virtual sources
        if (freqFilterEnabled) {
          if (Math.abs(speaker.frequency - freqFilterTarget) > freqFilterBandwidth) {
            return;
          }
        }

        const globalPos = new THREE.Vector3(...speaker.position).applyMatrix4(groupMatrix);
        
        const globalRot = [...speaker.rotation] as [number, number, number];
        globalRot[1] += group.rotation[1];

        globalSpeakers.push({
          ...speaker,
          position: [globalPos.x, globalPos.y, globalPos.z],
          rotation: globalRot
        });
      });
    });

    return generateVirtualSources(globalSpeakers, room, quality, obstacles, roomReflections);
  }, [speakerGroups, room, freqFilterEnabled, freqFilterTarget, freqFilterBandwidth, quality, obstacles, roomReflections]);

  const updateGroup = (id: string, updates: Partial<SpeakerGroupData>) => {
    setSpeakerGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const updateSpeakerInGroup = (groupId: string, speakerId: string, updates: Partial<SpeakerData>) => {
    setSpeakerGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        speakers: g.speakers.map(s => s.id === speakerId ? { ...s, ...updates } : s)
      };
    }));
  };

  const addGroup = (newGroup?: SpeakerGroupData) => {
    if (newGroup) {
      setSpeakerGroups(prev => [...prev, newGroup]);
      return;
    }
    
    setSpeakerGroups(prev => [...prev, {
      id: uuidv4(),
      name: 'New Group',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      speakers: [{
        id: uuidv4(),
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        frequency: 440,
        amplitude: 1.0,
        type: 'omni',
        phase: 0,
        delayMs: 0,
        invertPolarity: false
      }]
    }]);
  };

  const removeGroup = (id: string) => {
    setSpeakerGroups(prev => prev.filter(g => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  const loadGlobalPreset = (env: GlobalEnvironment) => {
    setRoom(env.room);
    setSpeakerGroups(env.groups);
    setSelectedGroupId(null);
  };

  // Obstacle CRUD
  const addObstacle = (shape: ObstacleShape) => {
    const defaultSize: [number, number, number] = shape === 'box' ? [2, 2, 2] : [1, 2, 1];
    setObstacles(prev => [...prev, {
      id: uuidv4(),
      shape,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      size: defaultSize
    }]);
  };

  const updateObstacle = (id: string, updates: Partial<ObstacleData>) => {
    setObstacles(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const removeObstacle = (id: string) => {
    setObstacles(prev => prev.filter(o => o.id !== id));
    if (selectedObstacleId === id) setSelectedObstacleId(null);
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex text-slate-200 font-sans overflow-hidden">
      
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 8, 12], fov: 50 }} shadows>
          <color attach="background" args={['#0f172a']} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          
          <OrbitControls makeDefault />
          
          <Room3D room={room} />
          
          {speakerGroups.map(group => (
            <Group3D 
              key={group.id} 
              group={group} 
              updateGroup={updateGroup}
              selected={selectedGroupId === group.id}
              onSelect={() => { setSelectedGroupId(group.id); setSelectedObstacleId(null); }}
            />
          ))}

          {obstacles.map(obs => (
            <Obstacle3D
              key={obs.id}
              obstacle={obs}
              updateObstacle={updateObstacle}
              selected={selectedObstacleId === obs.id}
              onSelect={() => { setSelectedObstacleId(obs.id); setSelectedGroupId(null); }}
            />
          ))}
          
          {visMode === 'single-plane' && (
            <VisualizationPlane 
              virtualSources={virtualSources} obstacles={obstacles} width={room.width} depth={room.depth}
              position={[0, planeY, 0]} rotation={[-Math.PI / 2, 0, 0]}
              steadyState={steadyState} speedOfSound={343.0}
            />
          )}

          {visMode === '3-planes' && (
            <group>
              <VisualizationPlane 
                virtualSources={virtualSources} obstacles={obstacles} width={room.width} depth={room.depth}
                position={[0, planeY, 0]} rotation={[-Math.PI / 2, 0, 0]} steadyState={steadyState} speedOfSound={343.0}
              />
              <VisualizationPlane 
                virtualSources={virtualSources} obstacles={obstacles} width={room.width} depth={room.height}
                position={[0, 0, 0]} rotation={[0, 0, 0]} steadyState={steadyState} speedOfSound={343.0}
              />
              <VisualizationPlane 
                virtualSources={virtualSources} obstacles={obstacles} width={room.depth} depth={room.height}
                position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} steadyState={steadyState} speedOfSound={343.0}
              />
            </group>
          )}

          {visMode === 'volumetric' && (
            <VisualizationVolume 
              virtualSources={virtualSources} obstacles={obstacles} width={room.width} height={room.height} depth={room.depth}
              steadyState={steadyState} speedOfSound={343.0} density={volumetricDensity} quality={quality}
            />
          )}
        </Canvas>
        
        {/* Instruction overlay */}
        <div className="absolute top-4 left-4 pointer-events-none text-slate-400 text-sm">
          <p>Left Click + Drag to rotate camera</p>
          <p>Right Click + Drag to pan camera</p>
          <p>Click on a speaker group or object to move it</p>
        </div>
      </div>

      {/* Control Panel */}
      <UIOverlay 
        room={room} 
        setRoom={setRoom} 
        speakerGroups={speakerGroups}
        selectedGroupId={selectedGroupId}
        updateGroup={updateGroup}
        updateSpeakerInGroup={updateSpeakerInGroup}
        addGroup={addGroup}
        removeGroup={removeGroup}
        loadGlobalPreset={loadGlobalPreset}
        obstacles={obstacles}
        addObstacle={addObstacle}
        updateObstacle={updateObstacle}
        removeObstacle={removeObstacle}
        steadyState={steadyState}
        setSteadyState={setSteadyState}
        visMode={visMode}
        setVisMode={setVisMode}
        volumetricDensity={volumetricDensity}
        setVolumetricDensity={setVolumetricDensity}
        planeY={planeY}
        setPlaneY={setPlaneY}
        freqFilterEnabled={freqFilterEnabled}
        setFreqFilterEnabled={setFreqFilterEnabled}
        freqFilterTarget={freqFilterTarget}
        setFreqFilterTarget={setFreqFilterTarget}
        freqFilterBandwidth={freqFilterBandwidth}
        setFreqFilterBandwidth={setFreqFilterBandwidth}
        quality={quality}
        setQuality={setQuality}
        shareState={handleShareState}
        roomReflections={roomReflections}
        setRoomReflections={setRoomReflections}
      />

    </div>
  );
}

export default App;
