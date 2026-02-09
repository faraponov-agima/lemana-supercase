"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const S = 0.5; // half cube size (X, Z)
const H = 0.25; // half cube height (Y) — half as tall

// Each level: [colorA | null, colorB | null]
// null = that half-prism is removed
const LEVEL_COLORS: [string | null, string | null][] = [
  ["#FF7A45", "#E53935"], // orange + red  (full cube)
  [null, "#AB47BC"],      // only B — purple
  ["#FFEE58", null],      // only A — yellow
  [null, "#CE93D8"],      // only B — lavender
  ["#FFEE58", "#FF7A45"], // yellow + orange (full cube)
];

/* ------------------------------------------------------------------ */
/*  Geometry: half-cube (triangular prism) split by vertical diagonal */
/* ------------------------------------------------------------------ */

function createPrismGeometry(half: "a" | "b"): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const s = S; // half-width / half-depth
  const h = H; // half-height

  /*
   * The block goes from (-s,-h,-s) to (s,h,s).
   * The cut plane passes through the diagonal:
   *   (-s,y,-s) → (s,y,s)  for any y
   *
   * Half A contains vertex (s,*,-s) — "front-right" prism
   * Half B contains vertex (-s,*,s) — "back-left" prism
   */

  const positions =
    half === "a"
      ? new Float32Array([
          // Bottom triangle (y = -h)
          -s, -h, -s, s, -h, -s, s, -h, s,
          // Top triangle (y = h)
          -s, h, -s, s, h, s, s, h, -s,
          // Front face (z = -s)
          -s, -h, -s, s, h, -s, s, -h, -s,
          -s, -h, -s, -s, h, -s, s, h, -s,
          // Right face (x = s)
          s, -h, -s, s, h, -s, s, h, s,
          s, -h, -s, s, h, s, s, -h, s,
          // Diagonal face
          -s, -h, -s, s, -h, s, s, h, s,
          -s, -h, -s, s, h, s, -s, h, -s,
        ])
      : new Float32Array([
          // Bottom triangle (y = -h)
          -s, -h, -s, s, -h, s, -s, -h, s,
          // Top triangle (y = h)
          -s, h, -s, -s, h, s, s, h, s,
          // Left face (x = -s)
          -s, -h, -s, -s, -h, s, -s, h, s,
          -s, -h, -s, -s, h, s, -s, h, -s,
          // Back face (z = s)
          -s, -h, s, s, -h, s, s, h, s,
          -s, -h, s, s, h, s, -s, h, s,
          // Diagonal face
          -s, -h, -s, -s, h, -s, s, h, s,
          -s, -h, -s, s, h, s, s, -h, s,
        ]);

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Components                                                        */
/* ------------------------------------------------------------------ */

function HalfCube({ half, color }: { half: "a" | "b"; color: string }) {
  const geometry = useMemo(() => createPrismGeometry(half), [half]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        flatShading
        roughness={0.35}
        metalness={0.05}
        envMapIntensity={0.6}
      />
    </mesh>
  );
}

function CubeWireframe() {
  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, H * 2, 1)),
    [],
  );

  // Diagonal lines on top & bottom faces
  const diagGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          -S, -H, -S, S, -H, S, // bottom diagonal
          -S, H, -S, S, H, S, // top diagonal
        ]),
        3,
      ),
    );
    return geo;
  }, []);

  return (
    <group>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#c8c8c8" transparent opacity={0.6} />
      </lineSegments>
      <lineSegments geometry={diagGeo}>
        <lineBasicMaterial color="#c8c8c8" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

const SKELETON_COUNT = LEVEL_COLORS.length * 5; // wireframe extends 5× the colored tower
const PRISM_OFFSET = Math.floor((SKELETON_COUNT - LEVEL_COLORS.length) / 2);
const STEP = H * 2; // vertical spacing between levels

function Tower() {
  const ref = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={ref}>
      {/* Full wireframe skeleton */}
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <group
          key={`w${i}`}
          position={[0, (i - (SKELETON_COUNT - 1) / 2) * STEP, 0]}
        >
          <CubeWireframe />
        </group>
      ))}

      {/* Colored prisms in the middle */}
      {LEVEL_COLORS.map(([colorA, colorB], i) => {
        const skeletonIdx = PRISM_OFFSET + i;
        return (
          <group
            key={`p${i}`}
            position={[
              0,
              (skeletonIdx - (SKELETON_COUNT - 1) / 2) * STEP,
              0,
            ]}
          >
            {colorA && <HalfCube half="a" color={colorA} />}
            {colorB && <HalfCube half="b" color={colorB} />}
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export default function TowerScene() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#ffffff" }}>
      <Canvas
        shadows
        orthographic
        camera={{
          position: [10, 10, 10],
          zoom: 240,
          near: -100,
          far: 100,
        }}
      >
        <ambientLight intensity={1} />
        <directionalLight
          position={[5, 10, 7]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-4, 6, -4]} intensity={0.3} />
        <Tower />
      </Canvas>
    </div>
  );
}
