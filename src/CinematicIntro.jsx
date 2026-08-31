import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars, MeshDistortMaterial, Environment } from '@react-three/drei'
import * as THREE from 'three'

function GoldenRing({ position = [0, 0, 0], size = 1, color = '#9b5cff' }) {
  const ref = useRef(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.x = t * 0.25
      ref.current.rotation.y = t * 0.4
      ref.current.position.y = position[1] + Math.sin(t * 0.6) * 0.25
    }
  })
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[size, size * 0.25, 24, 80]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        metalness={0.9}
        roughness={0.25}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}

function FloatingGem({ position = [0, 0, 0], size = 0.6, color = '#5b8cff', speed = 0.5 }) {
  const ref = useRef(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.x = t * speed
      ref.current.rotation.y = t * speed * 0.8
      ref.current.position.y = position[1] + Math.sin(t * speed * 1.6) * 0.5
    }
  })
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[size, 0]} />
      <MeshDistortMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        metalness={0.85}
        roughness={0.15}
        distort={0.35}
        speed={2}
      />
    </mesh>
  )
}

function GoldCore({ position = [0, 0, -2] }) {
  const ref = useRef(null)
  useFrame((state) => {
    const s = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.08
    if (ref.current) ref.current.scale.setScalar(s)
  })
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[1.6, 48, 48]} />
      <MeshDistortMaterial
        color="#2a1b52"
        emissive="#7a3bff"
        emissiveIntensity={0.35}
        metalness={0.6}
        roughness={0.2}
        distort={0.3}
        speed={1.6}
      />
    </mesh>
  )
}

function Particles({ count = 900 }) {
  const ref = useRef(null)
  const positions = useRef(new Float32Array(count * 3))
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 18
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 18
    }
  }, [count])
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03
    }
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#b9a6ff" transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime
    state.camera.position.x = Math.sin(t * 0.15) * 0.6
    state.camera.position.y = Math.cos(t * 0.2) * 0.4
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

const STAR_LINES = [
  'Create stunning visuals, instantly.',
  'AI art from a single prompt.',
  'Fast. Fun. Endlessly creative.',
  'Where imagination becomes imagery.',
]

export default function CinematicIntro({ onFinish }) {
  const [progress, setProgress] = useState(0)
  const [line, setLine] = useState(0)
  const [fading, setFading] = useState(false)
  const DURATION = 30000

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / DURATION) * 100)
      setProgress(pct)
      setLine(Math.min(STAR_LINES.length - 1, Math.floor((pct / 100) * STAR_LINES.length)))
      if (pct >= 100) {
        clearInterval(interval)
        setTimeout(() => setFading(true), 300)
        setTimeout(onFinish, 1400)
      }
    }, 120)
    return () => clearInterval(interval)
  }, [onFinish])

  function skip() {
    setFading(true)
    setTimeout(onFinish, 700)
  }

  return (
    <div className={`cinematic-intro${fading ? ' fading' : ''}`} onClick={skip}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} />
        <pointLight position={[-5, -3, 4]} intensity={1.4} color="#7a3bff" />
        <pointLight position={[5, 3, -4]} intensity={1} color="#22c55e" />
        <Stars radius={60} depth={40} count={2500} factor={3} saturation={0.4} fade speed={1} />
        <GoldCore />
        <GoldenRing position={[0, 1.1, -1.5]} size={1.1} color="#b08bff" />
        <GoldenRing position={[0, -1.2, -1]} size={1.5} color="#5b8cff" />
        <Float speed={1.6} rotationIntensity={1.1} floatIntensity={1.6}>
          <FloatingGem position={[3.4, 1.2, -1]} size={0.6} color="#ffd166" speed={0.5} />
        </Float>
        <Float speed={1.8} rotationIntensity={1.3} floatIntensity={1.8}>
          <FloatingGem position={[-3.4, -1.6, -0.6]} size={0.5} color="#22c55e" speed={0.6} />
        </Float>
        <Particles count={900} />
        <CameraRig />
        <Environment preset="city" />
      </Canvas>

      <div className="cinematic-overlay" />

      <div className="cinematic-content">
        <div className="intro-logo">
          <img src="/Plogo.png" alt="Pixora" className="intro-logo-img" />
        </div>
        <h1 className="intro-title">PIXORA</h1>
        <p className="intro-tagline" key={line}>{STAR_LINES[line]}</p>

        <div className="intro-progress">
          <div className="intro-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="intro-progress-labels">
          <span>Preparing your creative studio</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <button className="intro-skip" onClick={(e) => { e.stopPropagation(); skip() }}>
          Skip intro <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}
