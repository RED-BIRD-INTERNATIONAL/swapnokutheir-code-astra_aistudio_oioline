import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface AgentTelemetry3DProps {
  cpu: number; // 0-100
  memory: number; // 0-100
  network: number; // Mbps or normalized
  isWarning: boolean;
}

export const AgentTelemetry3D: React.FC<AgentTelemetry3DProps> = ({ cpu, memory, network, isWarning }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Three.js objects ref to avoid re-creation
  const objectsRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    nodeGroup: THREE.Group;
    cpuCores: THREE.InstancedMesh;
    memoryPlates: THREE.InstancedMesh;
    networkRings: THREE.Group;
    glowMaterial: THREE.MeshStandardMaterial;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Setup Renderer
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(400, 300); // Fixed size for overlay, or responsive

    // 2. Setup Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 400 / 300, 0.1, 1000);
    camera.position.set(5, 5, 8);
    camera.lookAt(0, 0, 0);

    // 3. Environment & Lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(5, 10, 5);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x4433aa, 0x111122, 1);
    scene.add(fillLight);

    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

    // 4. Procedural Models (Composite 3-12 parts)
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    // Core Structure (Hub)
    const hubGeometry = new THREE.OctahedronGeometry(1, 2);
    const hubMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      emissive: 0x000000,
    });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    nodeGroup.add(hub);

    // CPU Visualizer (Instanced Cubes orbiting)
    const coreCount = 16;
    const coreGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff });
    const cpuCores = new THREE.InstancedMesh(coreGeometry, coreMaterial, coreCount);
    nodeGroup.add(cpuCores);

    // Memory Visualizer (Layered translucent plates)
    const plateCount = 8;
    const plateGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.05, 32);
    const plateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.3,
      transmission: 0.5,
      metalness: 0.1,
      roughness: 0.2,
    });
    const memoryPlates = new THREE.InstancedMesh(plateGeometry, plateMaterial, plateCount);
    nodeGroup.add(memoryPlates);

    // Network Visualizer (Animated Rings)
    const networkRings = new THREE.Group();
    nodeGroup.add(networkRings);
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringGeo = new THREE.TorusGeometry(2 + i * 0.5, 0.02, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      networkRings.add(ring);
    }

    const glowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      emissive: 0x00ff00, 
      emissiveIntensity: 1 
    });

    objectsRef.current = {
      renderer,
      scene,
      camera,
      nodeGroup,
      cpuCores,
      memoryPlates,
      networkRings,
      glowMaterial
    };

    // 5. Animation Loop
    const clock = new THREE.Clock();
    const scratchMatrix = new THREE.Matrix4();
    const scratchPos = new THREE.Vector3();
    const scratchScale = new THREE.Vector3();
    const scratchQuat = new THREE.Quaternion();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      
      const { 
        nodeGroup, cpuCores, memoryPlates, networkRings, 
        glowMaterial, renderer, scene, camera 
      } = objectsRef.current!;

      // Update Node overall rotation
      nodeGroup.rotation.y += delta * 0.2;
      nodeGroup.rotation.z += delta * 0.1;

      // Pulse hub based on isWarning
      const hubScale = 1 + Math.sin(elapsed * (isWarning ? 10 : 2)) * 0.05;
      hub.scale.set(hubScale, hubScale, hubScale);
      hubMaterial.emissive.setHex(isWarning ? 0xff0000 : 0x00ffcc);
      hubMaterial.emissiveIntensity = isWarning ? (0.5 + Math.sin(elapsed * 15) * 0.5) : 0.2;

      // Update CPU Cores (orbiting speed depends on CPU usage)
      const cpuSpeed = cpu / 100 * 5 + 1;
      for (let i = 0; i < coreCount; i++) {
        const phi = (i / coreCount) * Math.PI * 2 + elapsed * cpuSpeed;
        const theta = (i / coreCount) * Math.PI;
        const r = 1.8 + Math.sin(elapsed * 2 + i) * 0.1;
        
        scratchPos.set(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(theta)
        );
        scratchScale.setScalar(0.8 + Math.sin(elapsed * 4 + i) * 0.2);
        scratchMatrix.compose(scratchPos, scratchQuat, scratchScale);
        cpuCores.setMatrixAt(i, scratchMatrix);
        
        // Color cores based on CPU (cyan to red)
        const cpuColor = new THREE.Color().lerpColors(
          new THREE.Color(0x00ffff), 
          new THREE.Color(0xff0000), 
          cpu / 100
        );
        cpuCores.setColorAt(i, cpuColor);
      }
      cpuCores.instanceMatrix.needsUpdate = true;
      if (cpuCores.instanceColor) cpuCores.instanceColor.needsUpdate = true;

      // Update Memory Plates (height depends on memory usage)
      const memHeight = memory / 100 * 2;
      for (let i = 0; i < plateCount; i++) {
        const y = (i / plateCount - 0.5) * memHeight;
        scratchPos.set(0, y, 0);
        scratchScale.set(1, 1, 1);
        scratchMatrix.compose(scratchPos, scratchQuat, scratchScale);
        memoryPlates.setMatrixAt(i, scratchMatrix);
      }
      memoryPlates.instanceMatrix.needsUpdate = true;

      // Update Network Rings (vibration depends on network throughput)
      const netVib = network / 1000 * 2;
      networkRings.children.forEach((ring, i) => {
        const r = ring as THREE.Mesh;
        const ringScale = 1 + Math.sin(elapsed * 10 + i) * 0.02 * (network / 50);
        r.scale.set(ringScale, ringScale, ringScale);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.2 + (network / 1000) * 0.5;
      });

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(requestRef.current);
      
      // Cleanup
      const { renderer, scene, cpuCores, memoryPlates } = objectsRef.current!;
      cpuCores.geometry.dispose();
      (cpuCores.material as THREE.Material).dispose();
      memoryPlates.geometry.dispose();
      (memoryPlates.material as THREE.Material).dispose();
      hub.geometry.dispose();
      (hub.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative group">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Overlay UI inside 3D scene (labels) */}
      <div className="absolute top-4 left-4 pointer-events-none space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">CPU: {cpu.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">MEM: {memory.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">NET: {network.toFixed(0)} Mbps</span>
        </div>
      </div>

      {isWarning && (
        <div className="absolute inset-0 border-2 border-red-500/30 rounded-2xl pointer-events-none animate-pulse" />
      )}
    </div>
  );
};
