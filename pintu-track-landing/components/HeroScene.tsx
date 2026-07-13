"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const COINS: { pos: [number, number, number]; scale: number; speed: number }[] = [
  { pos: [-1.6, 1.2, 0.6], scale: 1, speed: 1.4 },
  { pos: [1.7, 0.9, 0.4], scale: 0.8, speed: 1.1 },
  { pos: [-1.9, -0.6, 0.8], scale: 0.7, speed: 1.6 },
  { pos: [1.4, -1.1, 0.9], scale: 0.9, speed: 1.2 },
  { pos: [0.2, 1.8, -0.4], scale: 0.6, speed: 1.8 },
  { pos: [-0.8, -1.7, 0.5], scale: 0.75, speed: 1.3 },
  { pos: [2.2, -0.1, -0.6], scale: 0.65, speed: 1.5 },
  { pos: [-2.4, 0.3, -0.5], scale: 0.7, speed: 1.0 },
];

function Coin({
  pos,
  scale,
  speed,
}: {
  pos: [number, number, number];
  scale: number;
  speed: number;
}) {
  return (
    <Float speed={speed} rotationIntensity={1.2} floatIntensity={1.6}>
      <mesh position={pos} scale={scale} rotation={[Math.PI / 2.4, 0, 0.4]}>
        <cylinderGeometry args={[0.34, 0.34, 0.07, 40]} />
        <meshStandardMaterial color="#f5c242" metalness={0.9} roughness={0.25} />
      </mesh>
    </Float>
  );
}

function Door() {
  return (
    <group>
      {/* Kusen pintu */}
      <RoundedBox args={[0.22, 3.4, 0.22]} radius={0.06} position={[-1.05, 0, 0]}>
        <meshStandardMaterial color="#0f1a24" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[0.22, 3.4, 0.22]} radius={0.06} position={[1.05, 0, 0]}>
        <meshStandardMaterial color="#0f1a24" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[2.32, 0.22, 0.22]} radius={0.06} position={[0, 1.7, 0]}>
        <meshStandardMaterial color="#0f1a24" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      {/* Bidang portal beremisi */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[1.9, 3.3]} />
        <meshBasicMaterial color="#0d9488" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[2.5, 3.9]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight position={[0, 0, 1.2]} intensity={6} color="#2dd4bf" distance={7} />
    </group>
  );
}

function Particles() {
  const positions = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = (Math.random() - 0.5) * 9;
      arr[i + 1] = (Math.random() - 0.5) * 6;
      arr[i + 2] = (Math.random() - 0.5) * 4;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#6ee7b7"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function Rig({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const p = pointer.current ?? { x: 0, y: 0 };
    const targetY = p.x * 0.16;
    const targetX = -p.y * 0.1;
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      targetY,
      0.05
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      targetX,
      0.05
    );
    group.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
  });

  return (
    <group ref={group}>
      <Door />
      {COINS.map((c, i) => (
        <Coin key={i} {...c} />
      ))}
      <Particles />
    </group>
  );
}

export default function HeroScene({
  pointer,
  active = true,
}: {
  pointer: React.RefObject<{ x: number; y: number }>;
  active?: boolean;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.3, 6.5], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      fallback={null}
      aria-hidden
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} color="#ffffff" />
      <Rig pointer={pointer} />
      {/* Env map lokal dari Lightformer — tanpa unduhan HDR eksternal */}
      <Environment resolution={64}>
        <Lightformer
          position={[0, 3, 4]}
          scale={[8, 3, 1]}
          intensity={2}
          color="#ffffff"
        />
        <Lightformer
          position={[-4, 0, 2]}
          scale={[3, 6, 1]}
          intensity={1.2}
          color="#2dd4bf"
        />
        <Lightformer
          position={[4, -1, 2]}
          scale={[3, 5, 1]}
          intensity={1}
          color="#f5c242"
        />
      </Environment>
    </Canvas>
  );
}
