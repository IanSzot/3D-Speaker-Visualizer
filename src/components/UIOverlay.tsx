import React from 'react';
import type { RoomData, SpeakerGroupData, SpeakerData } from '../types';
import { Settings, Volume2, Plus, Trash2, Box, Waves, SlidersHorizontal, Activity } from 'lucide-react';
import { generateLineArray, generateEndfireArray, generateArcDelayArray } from '../utils/presets';

interface UIOverlayProps {
  room: RoomData;
  setRoom: (room: RoomData) => void;
  speakerGroups: SpeakerGroupData[];
  selectedGroupId: string | null;
  updateGroup: (id: string, updates: Partial<SpeakerGroupData>) => void;
  updateSpeakerInGroup: (groupId: string, speakerId: string, updates: Partial<SpeakerData>) => void;
  addGroup: (group?: SpeakerGroupData) => void;
  removeGroup: (id: string) => void;
  steadyState: boolean;
  setSteadyState: (v: boolean) => void;
  visMode: 'single-plane' | '3-planes' | 'volumetric';
  setVisMode: (v: 'single-plane' | '3-planes' | 'volumetric') => void;
  volumetricDensity: number;
  setVolumetricDensity: (v: number) => void;
  planeY: number;
  setPlaneY: (v: number) => void;
  freqFilterEnabled: boolean;
  setFreqFilterEnabled: (v: boolean) => void;
  freqFilterTarget: number;
  setFreqFilterTarget: (v: number) => void;
  freqFilterBandwidth: number;
  setFreqFilterBandwidth: (v: number) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  room, setRoom, speakerGroups, selectedGroupId, updateGroup, updateSpeakerInGroup, addGroup, removeGroup, steadyState, setSteadyState, visMode, setVisMode, volumetricDensity, setVolumetricDensity, planeY, setPlaneY, freqFilterEnabled, setFreqFilterEnabled, freqFilterTarget, setFreqFilterTarget, freqFilterBandwidth, setFreqFilterBandwidth
}) => {
  const [splayAngle, setSplayAngle] = React.useState(2);

  return (
    <div className="w-80 bg-slate-800/90 backdrop-blur border-l border-slate-700 h-full overflow-y-auto flex flex-col p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-8 text-blue-400">
        <Waves className="w-6 h-6" />
        <h1 className="text-xl font-bold tracking-tight">Acoustics 3D</h1>
      </div>

      <div className="space-y-8 flex-1">
        {/* Simulation Controls */}
        <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-slate-200">Simulation</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Time State</span>
            <button 
              onClick={() => setSteadyState(!steadyState)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${steadyState ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-slate-700 text-slate-300'}`}
            >
              {steadyState ? 'Steady State' : 'Moving Waves'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">View</span>
            <select 
              value={visMode} 
              onChange={e => setVisMode(e.target.value as any)}
              className="bg-slate-700 text-xs px-2 py-1 rounded text-white border-none outline-none"
            >
              <option value="volumetric">Volumetric 3D</option>
              <option value="3-planes">3 Intersecting Planes</option>
              <option value="single-plane">Single Plane</option>
            </select>
          </div>

          {visMode === 'volumetric' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Hologram Opacity</span>
                <span>{(volumetricDensity * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min={0.05} max={1.0} step={0.05} 
                value={volumetricDensity} onChange={e => setVolumetricDensity(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          )}

          {visMode !== 'volumetric' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Horizontal Plane (Y)</span>
                <span>{planeY.toFixed(2)}m</span>
              </div>
              <input 
                type="range" min={-room.height/2} max={room.height/2} step={0.1} 
                value={planeY} onChange={e => setPlaneY(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          )}
        </section>

        {/* Frequency Filter */}
        <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2 className="font-semibold text-slate-200">Frequency Filter</h2>
            </div>
            <input 
              type="checkbox" 
              checked={freqFilterEnabled}
              onChange={e => setFreqFilterEnabled(e.target.checked)}
              className="accent-emerald-500 rounded border-slate-600 bg-slate-700"
            />
          </div>

          <div className={`space-y-4 transition-opacity ${freqFilterEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Target Band</span>
                <span>{freqFilterTarget} Hz</span>
              </div>
              <input 
                type="range" min={20} max={20000} step={1} 
                value={freqFilterTarget} onChange={e => setFreqFilterTarget(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Bandwidth</span>
                <span>±{freqFilterBandwidth} Hz</span>
              </div>
              <input 
                type="range" min={1} max={500} step={1} 
                value={freqFilterBandwidth} onChange={e => setFreqFilterBandwidth(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Only visualizes waves from speakers within {freqFilterTarget - freqFilterBandwidth}Hz - {freqFilterTarget + freqFilterBandwidth}Hz.
            </p>
          </div>
        </section>

        {/* Room Controls */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300 border-b border-slate-700 pb-2">
            <Box className="w-4 h-4" />
            <h2 className="font-semibold text-sm">Room Dimensions</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Width (X)</label>
              <input 
                type="number" value={room.width} onChange={e => setRoom({...room, width: parseFloat(e.target.value) || 1})}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Depth (Z)</label>
              <input 
                type="number" value={room.depth} onChange={e => setRoom({...room, depth: parseFloat(e.target.value) || 1})}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Height (Y)</label>
            <input 
              type="number" value={room.height} onChange={e => setRoom({...room, height: parseFloat(e.target.value) || 1})}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Wall Absorption</span>
              <span>{(room.absorption * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" min={0} max={1} step={0.01} 
              value={room.absorption} onChange={e => setRoom({...room, absorption: parseFloat(e.target.value)})}
              className="w-full accent-blue-500"
            />
          </div>
        </section>

        {/* Presets */}
        <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <h2 className="font-semibold text-slate-200">Acoustic Presets</h2>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <button 
                onClick={() => addGroup(generateLineArray([0, room.height / 2 - 0.5, 0], splayAngle))}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 px-3 rounded flex justify-center items-center gap-2 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Line Array
              </button>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-400">Splay Angle: {splayAngle}°</span>
                <input 
                  type="range" min={0} max={10} step={0.5} 
                  value={splayAngle} onChange={e => setSplayAngle(parseFloat(e.target.value))}
                  className="w-20 accent-purple-500"
                />
              </div>
            </div>

            <button 
              onClick={() => addGroup(generateEndfireArray([0, -room.height / 2 + 1, 0]))}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 px-3 rounded flex justify-center items-center gap-2 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Endfire Array (4 Subs)
            </button>

            <button 
              onClick={() => addGroup(generateArcDelayArray([0, -room.height / 2 + 1, 0]))}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 px-3 rounded flex justify-center items-center gap-2 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Arc Delay Array (7 Subs)
            </button>
          </div>
        </section>

        {/* Group Controls */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-slate-300 border-b border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <h2 className="font-semibold text-sm">Speaker Arrays</h2>
            </div>
            <button 
              onClick={() => addGroup()}
              className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {speakerGroups.map((group, index) => (
              <div 
                key={group.id} 
                className={`bg-slate-800 rounded-lg border overflow-hidden transition-colors ${selectedGroupId === group.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-slate-700'}`}
              >
                <div className="flex items-center justify-between bg-slate-900/50 p-2 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedGroupId === group.id ? 'bg-blue-500' : 'bg-slate-600'}`} />
                    <span className="text-xs font-medium text-slate-300">{group.name} ({group.speakers.length})</span>
                  </div>
                  <button 
                    onClick={() => removeGroup(group.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 space-y-4">
                  {/* Group Rotation Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      <span>Array Rotation (Y)</span>
                      <span>{(group.rotation[1] * 180 / Math.PI).toFixed(0)}°</span>
                    </div>
                    <input 
                      type="range" min={-Math.PI} max={Math.PI} step={0.1} 
                      value={group.rotation[1]} 
                      onChange={e => updateGroup(group.id, { rotation: [0, parseFloat(e.target.value), 0] })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Settings for individual speakers in group */}
                  {group.speakers.map((speaker, sIdx) => (
                    <div key={speaker.id} className="pt-3 border-t border-slate-700/50 space-y-3">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Box {sIdx + 1} Settings</div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Type</span>
                        <select 
                          value={speaker.type} 
                          onChange={e => updateSpeakerInGroup(group.id, speaker.id, { type: e.target.value as any })}
                          className="bg-slate-700 text-xs px-2 py-1 rounded text-white border-none outline-none w-24"
                        >
                          <option value="omni">Omni</option>
                          <option value="cardioid">Cardioid</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Freq</span>
                          <span>{speaker.frequency} Hz</span>
                        </div>
                        <input 
                          type="range" min={20} max={1000} step={1} 
                          value={speaker.frequency} 
                          onChange={e => updateSpeakerInGroup(group.id, speaker.id, { frequency: parseFloat(e.target.value) })}
                          className="w-full accent-blue-500"
                        />
                      </div>

                      {speaker.type === 'cardioid' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Dir (Y)</span>
                            <span>{(speaker.rotation[1] * 180 / Math.PI).toFixed(0)}°</span>
                          </div>
                          <input 
                            type="range" min={-Math.PI} max={Math.PI} step={0.1} 
                            value={speaker.rotation[1]} 
                            onChange={e => updateSpeakerInGroup(group.id, speaker.id, { rotation: [0, parseFloat(e.target.value), 0] })}
                            className="w-full accent-blue-500"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Delay</span>
                          <span>{speaker.delayMs || 0} ms</span>
                        </div>
                        <input 
                          type="range" min={0} max={20} step={0.1} 
                          value={speaker.delayMs || 0} 
                          onChange={e => updateSpeakerInGroup(group.id, speaker.id, { delayMs: parseFloat(e.target.value) })}
                          className="w-full accent-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`polarity-${speaker.id}`}
                          checked={speaker.invertPolarity || false}
                          onChange={e => updateSpeakerInGroup(group.id, speaker.id, { invertPolarity: e.target.checked })}
                          className="accent-blue-500 rounded border-slate-600 bg-slate-700"
                        />
                        <label htmlFor={`polarity-${speaker.id}`} className="text-xs text-slate-400 select-none cursor-pointer">
                          Invert Polarity (180°)
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {speakerGroups.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                No arrays. Add one above!
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};
