import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { OperatorSignBoard } from './OperatorSignBoard'
import { DistanceCullGate } from './DistanceCullGate'

// --- Tuning ---
const NPC_SCALE = 5.6                // 20% smaller than the original 7
const NPC_Y = 0                     // ground level — per-rig foot offset is auto-computed below
const PATROL_Z_MIN = -500           // just past Berth 5 (z = -480)
const PATROL_Z_MAX = 500            // just past Berth 1 (z = 480)
const BASE_WALK_SPEED = 11          // units per second (varied slightly per NPC)
const FACING_OFFSET = 0
const ANIMATION_INDEX = 0           // each rig has 1 walk clip

// Beyond this world-space distance, an NPC's skeletal AnimationMixer is no
// longer ticked each frame. The static (last-evaluated) pose still draws,
// the skeleton just stops re-computing — invisible at distance, but a real
// CPU saving across the 15-NPC roster while the camera roams the port.
const NPC_MIXER_CULL_DISTANCE = 500
// Beyond this distance the floating Operator sign board is unmounted (its
// drei <Html> DOM node removed), so the browser stops paying per-frame
// CSS-transform cost for signs that are barely a pixel on screen anyway.
const NPC_SIGN_CULL_DISTANCE = 280

const NPC_GLBS = [
  '/blender-asset/operator-female-1.glb',
  '/blender-asset/operator-male-1.glb',
] as const

/**
 * Deterministic PRNG (mulberry32) so the NPC layout / model picks stay
 * stable across reloads.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 61), t | 7)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The exported clips have translation tracks on every bone (not just the
 * root). Per-bone position keys fight the bind pose and produce visible
 * jitter. For a skinned humanoid we only need rotation — strip every
 * ".position" track. World position is driven by the patrol logic below.
 */
function stripBonePositions(clip: THREE.AnimationClip): THREE.AnimationClip {
  const filtered = clip.tracks.filter((t) => !t.name.endsWith('.position'))
  return new THREE.AnimationClip(clip.name, clip.duration, filtered)
}

/**
 * Compute a world-space bounding box that respects bone deformation.
 * `Box3.setFromObject` uses the static bind-pose geometry for SkinnedMesh
 * — it does NOT reflect the animated pose. To get the *actual* deformed
 * extents we have to call `SkinnedMesh.computeBoundingBox()` (which
 * iterates each vertex through `applyBoneTransform`) and then transform
 * the resulting local box by the mesh's world matrix.
 *
 * Caller must have already updated bone matrices via
 * `root.updateMatrixWorld(true)` after the desired `mixer.update(...)`.
 */
const _tmpBox = new THREE.Box3()
function computeDeformedWorldBox(root: THREE.Object3D, out: THREE.Box3): THREE.Box3 {
  out.makeEmpty()
  root.traverse((child) => {
    const skinned = child as THREE.SkinnedMesh
    if ((skinned as THREE.SkinnedMesh).isSkinnedMesh) {
      skinned.skeleton.update()
      skinned.computeBoundingBox()
      if (skinned.boundingBox) {
        _tmpBox.copy(skinned.boundingBox).applyMatrix4(skinned.matrixWorld)
        out.union(_tmpBox)
      }
      return
    }
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      if (mesh.geometry.boundingBox) {
        _tmpBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
        out.union(_tmpBox)
      }
    }
  })
  return out
}

interface NpcSpec {
  id: string
  glb: (typeof NPC_GLBS)[number]
  position: [number, number, number]
  /** If walking: traverses z between PATROL_Z_MIN and PATROL_Z_MAX. */
  mode: 'walk' | 'idle'
  /** Initial direction for walking NPCs (+1 = +Z, -1 = -Z). */
  direction: 1 | -1
  /** Speed multiplier (only used when mode === 'walk'). */
  speedFactor: number
  /** Static facing for idle NPCs (radians around Y). */
  idleRotationY: number
}

/**
 * Build the NPC roster. 25 total before pruning:
 *   - 8 lane walkers patrolling Berth 1 ↔ Berth 5 along fixed road / yard
 *     lanes, 2 per lane (opposite directions, staggered z).
 *   - 7 fixed-position idlers spread by berth row across road / yard lanes.
 *   - 6 extra walkers + 4 extra idlers scattered randomly across the full
 *     road and yard area (deterministic PRNG → stable across reloads).
 *
 * After build, 5 walking (animated) NPCs are deterministically dropped to
 * lighten the animation load — final roster is 20 (9 walkers + 11 idlers).
 *
 * No NPCs sit on the quay deck — that area is reserved for cranes and
 * vessels.
 *
 * Lane x-coordinates (port layout reference):
 *   quay deck       x = -43   (avoid — cranes / vessels)
 *   road inner      x = -25   (road, quay-side edge)
 *   road outer      x =   0   (road, yard-side edge)
 *   yard handover   x =  22
 *   yard centre     x =  70
 *   yard far        x = 110
 */
function buildRoster(): NpcSpec[] {
  const rand = mulberry32(20260501)
  const pickGlb = () => NPC_GLBS[Math.floor(rand() * NPC_GLBS.length)]

  // 8 walking NPCs spread across 4 road / yard lanes (no quay).
  const walkLanes = [
    -25,   // road, quay-side edge
      0,   // road, yard-side edge
     22,   // yard handover lane
    110,   // yard far edge
  ]
  const walkers: NpcSpec[] = []
  walkLanes.forEach((laneX, laneIdx) => {
    // Two NPCs per lane: one starting in the south half walking north,
    // one in the north half walking south. Stagger their starting z so
    // they don't pass each other at the same point every loop.
    const startZA = -300 + laneIdx * 60       // south-ish
    const startZB =  300 - laneIdx * 60       // north-ish
    walkers.push({
      id: `npc-walk-${laneIdx}-a`,
      glb: pickGlb(),
      position: [laneX, NPC_Y, startZA],
      mode: 'walk',
      direction: 1,
      speedFactor: 0.85 + rand() * 0.4,       // 0.85–1.25
      idleRotationY: 0,
    })
    walkers.push({
      id: `npc-walk-${laneIdx}-b`,
      glb: pickGlb(),
      position: [laneX, NPC_Y, startZB],
      mode: 'walk',
      direction: -1,
      speedFactor: 0.85 + rand() * 0.4,
      idleRotationY: 0,
    })
  })

  // 7 stationary NPCs: spread across road and yard lanes near berths 1, 2,
  // 4 and 5 only. Berth 3 / Yard 3 (z ≈ 0, |z| ≤ 120) is intentionally kept
  // empty of stationary NPCs so it reads as the "active / contested" berth.
  // Alternate lanes (road / yard handover / yard centre / yard far) so the
  // crowd looks naturally distributed instead of lined up.
  const idlePositions: [number, number, number][] = [
    [ -25, NPC_Y,  450],   // road, near Berth 1
    [  70, NPC_Y,  210],   // yard centre, near Berth 2
    [  22, NPC_Y,  300],   // yard handover, near Berth 2 (relocated from Berth 3)
    [ 110, NPC_Y, -270],   // yard far edge, near Berth 4
    [ -25, NPC_Y, -510],   // road, near Berth 5
    [ 110, NPC_Y,  390],   // yard far edge, near Berth 1 (relocated from yards 2/3 edge)
    [  70, NPC_Y, -420],   // yard centre, near Berth 5 (relocated from yards 3/4 edge)
  ]
  const idlers: NpcSpec[] = idlePositions.map((pos, i) => ({
    id: `npc-idle-${i}`,
    glb: pickGlb(),
    position: pos,
    mode: 'idle',
    direction: 1,
    speedFactor: 0,
    // Random facing so the crowd doesn't all stare the same way.
    idleRotationY: rand() * Math.PI * 2,
  }))

  // --- Extra randomly-scattered NPCs across the entire road + yard area ---
  // 6 walkers + 4 standing, placed by the same deterministic PRNG so the
  // layout is stable across reloads. x range covers road-inner to yard-far;
  // z range covers a bit beyond Berth 1 / Berth 5 so they appear truly
  // spread out rather than clustered around the central berths.
  const SCATTER_X_MIN = -25     // road, quay-side edge
  const SCATTER_X_MAX = 130     // yard, far edge
  const SCATTER_Z_MIN = -520
  const SCATTER_Z_MAX =  520

  const extraWalkers: NpcSpec[] = Array.from({ length: 6 }, (_, i) => {
    const x = SCATTER_X_MIN + rand() * (SCATTER_X_MAX - SCATTER_X_MIN)
    const z = SCATTER_Z_MIN + rand() * (SCATTER_Z_MAX - SCATTER_Z_MIN)
    return {
      id: `npc-walk-extra-${i}`,
      glb: pickGlb(),
      position: [x, NPC_Y, z],
      mode: 'walk',
      direction: rand() < 0.5 ? 1 : -1,
      speedFactor: 0.85 + rand() * 0.4,
      idleRotationY: 0,
    }
  })

  // Berth 3 / Yard 3 keep-out band on the z-axis. Anything stationary that
  // would land inside this strip gets resampled so the berth stays empty of
  // idle operators (walkers may still pass through).
  const BERTH3_Z_HALF = 120
  const extraIdlers: NpcSpec[] = Array.from({ length: 4 }, (_, i) => {
    const x = SCATTER_X_MIN + rand() * (SCATTER_X_MAX - SCATTER_X_MIN)
    let z = SCATTER_Z_MIN + rand() * (SCATTER_Z_MAX - SCATTER_Z_MIN)
    // Reject samples that fall inside the Berth 3 / Yard 3 band. Bounded
    // attempts so a pathological PRNG run can’t loop forever; on the final
    // fallback, push the NPC to the nearest neighboring berth row.
    let attempts = 0
    while (Math.abs(z) <= BERTH3_Z_HALF && attempts < 8) {
      z = SCATTER_Z_MIN + rand() * (SCATTER_Z_MAX - SCATTER_Z_MIN)
      attempts++
    }
    if (Math.abs(z) <= BERTH3_Z_HALF) {
      z = z >= 0 ? BERTH3_Z_HALF + 60 : -(BERTH3_Z_HALF + 60)
    }
    return {
      id: `npc-idle-extra-${i}`,
      glb: pickGlb(),
      position: [x, NPC_Y, z],
      mode: 'idle',
      direction: 1,
      speedFactor: 0,
      idleRotationY: rand() * Math.PI * 2,
    }
  })

  const fullRoster = [...walkers, ...idlers, ...extraWalkers, ...extraIdlers]

  // Deterministically drop 5 *walking* (animated) NPCs from the roster
  // (same PRNG → stable selection across reloads). Idle NPCs are kept
  // intact so the static crowd density stays the same.
  const REMOVE_WALKERS = 5
  const walkerIndices = fullRoster
    .map((spec, i) => (spec.mode === 'walk' ? i : -1))
    .filter((i) => i >= 0)
  const dropIdx = new Set<number>()
  while (dropIdx.size < REMOVE_WALKERS && dropIdx.size < walkerIndices.length) {
    dropIdx.add(walkerIndices[Math.floor(rand() * walkerIndices.length)])
  }
  return fullRoster.filter((_, i) => !dropIdx.has(i))
}

// Reused inside Npc.useFrame so we don't allocate a Vector3 every tick.
const _npcWorldPos = new THREE.Vector3()

/**
 * Renders a single NPC. We clone the skinned scene with SkeletonUtils so
 * every NPC owns its own skeleton (drei's useGLTF returns a shared scene),
 * and run a private AnimationMixer so each rig animates independently.
 */
function Npc({ spec }: { spec: NpcSpec }) {
  const gltf = useGLTF(spec.glb)
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const directionRef = useRef<1 | -1>(spec.direction)
  // Local-space y of the NPC's head (after foot-fit). Used to position the
  // floating sign board just above. Updated once during the fit pass.
  const [signYOffset, setSignYOffset] = useState(1.26)

  // Per-instance skinned-mesh clone so each NPC has its own skeleton.
  const clonedScene = useMemo(() => cloneSkeleton(gltf.scene) as THREE.Object3D, [gltf.scene])

  const cleanClips = useMemo(
    () => gltf.animations.map(stripBonePositions),
    [gltf.animations],
  )

  useEffect(() => {
    if (!clonedScene || cleanClips.length === 0) return
    const mixer = new THREE.AnimationMixer(clonedScene)
    mixerRef.current = mixer

    const clipIndex = Math.min(ANIMATION_INDEX, cleanClips.length - 1)
    const action = mixer.clipAction(cleanClips[clipIndex])
    action.setLoop(THREE.LoopRepeat, Infinity)
    if (spec.mode === 'walk') {
      action.play()
    } else {
      // Stationary NPCs: freeze on a natural mid-stride pose so they don't
      // sit in T-pose. timeScale=0 holds the frame; play() is required to
      // make the mixer evaluate the clip even once.
      action.play()
      action.time = 0
      action.timeScale = 0
    }

    // Skinned meshes can disappear when their (static) bounding sphere is
    // wrong after bone deformation — keep them always-rendered.
    clonedScene.traverse((child) => {
      const mesh = child as THREE.Mesh | THREE.SkinnedMesh
      if ((mesh as THREE.Mesh).isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        mesh.frustumCulled = false
      }
    })

    // --- Foot-offset auto-fit ---
    // Each rig has a different armature origin AND its rendered pose
    // differs from the bind pose. `Box3.setFromObject` measures bind pose
    // only — useless for fitting an animated character to the ground. We
    // use a deformed-aware bbox helper, and for walking NPCs we sample
    // the clip at several time points so the *lowest* foot during the
    // entire walk cycle just touches the ground (not just frame 0).
    //
    // The math MUST be idempotent: React StrictMode (dev) runs this
    // effect twice (mount → unmount → mount). If we computed the lift
    // against the already-lifted group position, the second pass would
    // measure feet already on the ground and reset the lift to zero,
    // sinking the NPC back. Reset Y to spec.position[1] before measuring
    // so the offset is always relative to the same baseline.
    const group = groupRef.current
    if (group) {
      group.position.y = spec.position[1]
      const clipDuration = action.getClip().duration
      const samples = spec.mode === 'walk' ? 12 : 1
      const bbox = new THREE.Box3()
      let minWorldY = Infinity
      let maxWorldY = -Infinity

      for (let i = 0; i < samples; i++) {
        action.time = samples > 1 ? (i / samples) * clipDuration : 0
        mixer.update(0)
        group.updateMatrixWorld(true)
        computeDeformedWorldBox(clonedScene, bbox)
        if (Number.isFinite(bbox.min.y) && bbox.min.y < minWorldY) {
          minWorldY = bbox.min.y
        }
        if (Number.isFinite(bbox.max.y) && bbox.max.y > maxWorldY) {
          maxWorldY = bbox.max.y
        }
      }

      if (Number.isFinite(minWorldY)) {
        // After measurement, group.position.y is still spec.position[1].
        // Lift it so the lowest vertex (currently at world y=minWorldY)
        // ends up exactly at spec.position[1].
        group.position.y = spec.position[1] + (spec.position[1] - minWorldY)
      }

      // Compute the head height in the group's LOCAL space so the sign
      // board floats just above each NPC regardless of rig origin
      // differences. (maxWorldY - minWorldY) = total deformed height.
      // Multiplier bumped 5% so the sign floats a touch higher above the head.
      if (Number.isFinite(minWorldY) && Number.isFinite(maxWorldY)) {
        setSignYOffset((maxWorldY - minWorldY + 4) * 1.05)
      }

      // Restore the action's playhead to a sensible starting frame.
      action.time = 0
      mixer.update(0)
    }

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clonedScene)
      mixerRef.current = null
    }
  }, [clonedScene, cleanClips, spec.mode, spec.position])

  useFrame((state, delta) => {
    const group = groupRef.current

    // Distance-cull the skeletal mixer. The cost of mixer.update() scales
    // with bone count; skipping it for far-away NPCs is a real CPU win and
    // visually undetectable at this distance.
    if (group) {
      group.getWorldPosition(_npcWorldPos)
      const camDist = state.camera.position.distanceTo(_npcWorldPos)
      if (camDist < NPC_MIXER_CULL_DISTANCE) {
        mixerRef.current?.update(delta)
      }
    } else {
      mixerRef.current?.update(delta)
    }

    if (spec.mode !== 'walk') return
    if (!group) return

    const speed = BASE_WALK_SPEED * spec.speedFactor
    let z = group.position.z + directionRef.current * speed * delta
    if (z >= PATROL_Z_MAX) {
      z = PATROL_Z_MAX
      directionRef.current = -1
    } else if (z <= PATROL_Z_MIN) {
      z = PATROL_Z_MIN
      directionRef.current = 1
    }
    group.position.z = z

    // Face the direction of travel.
    group.rotation.y =
      (directionRef.current === 1 ? 0 : Math.PI) + FACING_OFFSET
  })

  return (
    <group
      ref={groupRef}
      position={spec.position}
      rotation={[0, spec.mode === 'walk' ? (spec.direction === 1 ? 0 : Math.PI) : spec.idleRotationY, 0]}
      name={spec.id}
    >
      <primitive object={clonedScene} scale={NPC_SCALE} />
      <DistanceCullGate maxDistance={NPC_SIGN_CULL_DISTANCE}>
        <OperatorSignBoard yOffset={signYOffset} operatorId={spec.id} />
      </DistanceCullGate>
    </group>
  )
}

/**
 * Renders the full roster of 15 port NPCs (operators) scattered across the
 * port. Half walk back and forth between Berth 1 and Berth 5; the other
 * half stand stationary on the quay and in the yard.
 */
export function PortNpcs() {
  const roster = useMemo(() => buildRoster(), [])
  return (
    <group name="port-npcs">
      {roster.map((spec) => (
        <Npc key={spec.id} spec={spec} />
      ))}
    </group>
  )
}

// Preload all NPC models so the first frame doesn't pop them in one by one.
NPC_GLBS.forEach((url) => useGLTF.preload(url))
