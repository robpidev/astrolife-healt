import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createAdvancedHumanAnatomy } from '#lib/components/astronaut/anatomy/anatomy.js';
import type { BrainState } from '#lib/interfaces/body-map.js';

export interface BodyMapSceneOptions {
	/** Latest readings that colour the brain. */
	brain: BrainState;
	/** Heart rate in bpm; `null` falls back to 72. */
	heartRate: number | null;
	reducedMotion: boolean;
	/** Element that receives the OrbitControls pointer gestures. */
	interactiveElement: HTMLElement;
	/** Reports the camera azimuth after a drag, in degrees. */
	onRotate?: (degrees: number) => void;
}

export interface BodyMapScene {
	/** Yaw in degrees, as reported by the accessible slider. */
	setRotation(degrees: number): void;
	setBrain(state: BrainState): void;
	setHeartRate(bpm: number | null): void;
	setReducedMotion(reduced: boolean): void;
	resize(): void;
	/** Stops rendering and releases every GPU resource. */
	destroy(): void;
}

const CAMERA_FOV = 42;
const CAMERA_TARGET = new THREE.Vector3(0, 1.12, 0);
// Same viewing direction as the reference demo, normalised so resize() can
// change the distance without changing the angle.
const CAMERA_DIRECTION = new THREE.Vector3(0.35, 0.12, 2.25).normalize();
// The demo's "front" view is slightly off-axis; rotation 0 maps to that angle.
const FRONT_AZIMUTH = Math.atan2(CAMERA_DIRECTION.x, CAMERA_DIRECTION.z);
const FIGURE_BOTTOM = 0;
const FIGURE_TOP = 1.82;
const FIGURE_PADDING = 0.02;
// Default framing is this much further back than the tight fit, leaving room
// to zoom in before the figure reaches the edge of the frame.
const FRAME_SCALE = 1.2;
const DEFAULT_BPM = 72;
const BPM_RANGE: readonly [number, number] = [40, 180];
const AZIMUTH_EPSILON = 0.002;

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function effectiveBpm(heartRate: number | null): number {
	if (heartRate === null || !Number.isFinite(heartRate)) return DEFAULT_BPM;
	return clamp(heartRate, BPM_RANGE[0], BPM_RANGE[1]);
}

export function createBodyMapScene(
	canvas: HTMLCanvasElement,
	options: BodyMapSceneOptions
): BodyMapScene {
	const scene = new THREE.Scene();
	// No background: the canvas is transparent so the page shows through.
	scene.fog = new THREE.FogExp2(0x040914, 0.14);

	const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.04, 40);
	camera.position.copy(CAMERA_TARGET).addScaledVector(CAMERA_DIRECTION, 2.28);

	const renderer = new THREE.WebGLRenderer({
		canvas,
		alpha: true,
		antialias: true,
		powerPreference: 'high-performance'
	});
	renderer.setClearAlpha(0);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.1;

	const composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.55, 0.82);
	composer.addPass(bloomPass);
	const outputPass = new OutputPass();
	composer.addPass(outputPass);

	const controls = new OrbitControls(camera, options.interactiveElement);
	controls.enableDamping = !options.reducedMotion;
	controls.dampingFactor = 0.06;
	// Zoom-in never goes past the framing distance (set by resize), so the
	// figure can be pulled back but never cropped. Panning would also let it
	// drift out of frame, so it stays off.
	controls.enablePan = false;
	controls.minDistance = 0.28;
	controls.maxDistance = 4.5;
	controls.target.copy(CAMERA_TARGET);
	controls.update();

	// Anatomical studio lighting.
	scene.add(new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.85));

	const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
	keyLight.position.set(2.2, 3.0, 2.8);
	scene.add(keyLight);

	const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
	rimLight.position.set(-2.5, 1.8, -2.5);
	scene.add(rimLight);

	const heartPointLight = new THREE.PointLight(0xff2a55, 1.0, 0.9);
	heartPointLight.position.set(0.03, 1.26, 0.06);
	scene.add(heartPointLight);

	const brainPointLight = new THREE.PointLight(0x38bdf8, 0.7, 0.7);
	brainPointLight.position.set(0, 1.72, 0.04);
	scene.add(brainPointLight);

	const anatomy = createAdvancedHumanAnatomy();
	scene.add(anatomy.root);

	// Holographic base under the feet.
	const ringGeometry = new THREE.RingGeometry(0.42, 0.435, 64);
	const ringMaterial = new THREE.MeshBasicMaterial({
		color: 0x38bdf8,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.45
	});
	const baseRing = new THREE.Mesh(ringGeometry, ringMaterial);
	baseRing.rotation.x = -Math.PI / 2;
	scene.add(baseRing);

	const grid = new THREE.PolarGridHelper(0.62, 12, 5, 64, 0x1e3a5f, 0x0c1e33);
	scene.add(grid);

	// --- State ----------------------------------------------------------------
	let heartRate = options.heartRate;
	let reducedMotion = options.reducedMotion;
	const targetColor = new THREE.Color(options.brain.color);
	const displayedColor = new THREE.Color(options.brain.color);
	let targetGlow = options.brain.glow;
	let displayedGlow = options.brain.glow;
	let visible = true;
	let frame = 0;
	let destroyed = false;
	let lastTime = 0;
	let elapsed = 0;
	let lastReportedAzimuth = controls.getAzimuthalAngle();
	// Distance that frames the whole figure at the current aspect ratio. The
	// user's zoom is stored as a ratio against it so a resize keeps it.
	let framedDistance = 0;

	function applyBrainMaterial(color: THREE.Color, glow: number): void {
		anatomy.brainMaterial.emissive.copy(color);
		anatomy.brainMaterial.emissiveIntensity = glow;
		brainPointLight.color.copy(color);
		brainPointLight.intensity = 0.35 + glow * 0.5;
	}

	function resize(): void {
		const width = canvas.clientWidth || 1;
		const height = canvas.clientHeight || 1;
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		renderer.setPixelRatio(pixelRatio);
		renderer.setSize(width, height, false);
		composer.setPixelRatio(pixelRatio);
		composer.setSize(width, height);

		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		// The demo assumes a landscape window. In a portrait box the figure is
		// taller than the frame, so pull the camera back until feet and head fit.
		const halfHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
		const halfExtent = Math.max(CAMERA_TARGET.y - FIGURE_BOTTOM, FIGURE_TOP - CAMERA_TARGET.y);
		const fit = Math.max(2.28, (halfExtent + FIGURE_PADDING) / halfHeight);
		// Start a little further back than the tight fit so the user has room to
		// zoom in; the tight fit is the closest the camera may get, which keeps
		// the whole figure visible at every zoom level.
		const framed = fit * FRAME_SCALE;

		controls.minDistance = fit;
		controls.maxDistance = Math.max(framed * 1.5, 5);

		const offset = camera.position.clone().sub(controls.target);
		const spherical = new THREE.Spherical().setFromVector3(offset);
		// Keep the zoom the user dialled in; only the framing distance changes.
		const zoom = framedDistance > 0 ? spherical.radius / framedDistance : 1;
		framedDistance = framed;
		spherical.radius = clamp(framed * zoom, controls.minDistance, controls.maxDistance);
		offset.setFromSpherical(spherical);
		camera.position.copy(controls.target).add(offset);
		controls.update();
		lastReportedAzimuth = controls.getAzimuthalAngle();
	}

	function setRotation(degrees: number): void {
		const targetAzimuth = THREE.MathUtils.degToRad(degrees) + FRONT_AZIMUTH;
		const current = controls.getAzimuthalAngle();
		const diff = Math.atan2(Math.sin(targetAzimuth - current), Math.cos(targetAzimuth - current));
		if (Math.abs(diff) < AZIMUTH_EPSILON) return;

		const offset = camera.position.clone().sub(controls.target);
		const spherical = new THREE.Spherical().setFromVector3(offset);
		spherical.theta = targetAzimuth;
		offset.setFromSpherical(spherical);
		camera.position.copy(controls.target).add(offset);
		controls.update();
		lastReportedAzimuth = controls.getAzimuthalAngle();
	}

	function animate(now: number): void {
		if (destroyed) return;
		frame = requestAnimationFrame(animate);

		const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 0.05);
		lastTime = now;

		if (!visible) return;
		elapsed += delta;

		// Reduced motion freezes the heartbeat, breathing and pulses, but the
		// camera stays interactive because it is user-driven.
		const motion = reducedMotion ? 0 : 1;
		const bpm = effectiveBpm(heartRate);
		const phase = (elapsed * (bpm / 60)) % 1;
		const atrialPulse = Math.exp(-Math.pow((phase - 0.14) / 0.04, 2)) * motion;
		const ventPulse =
			(Math.exp(-Math.pow((phase - 0.27) / 0.045, 2)) +
				Math.exp(-Math.pow((phase - 0.42) / 0.06, 2)) * 0.45) *
			motion;

		anatomy.atriaGroup.scale.setScalar(1 + atrialPulse * 0.14);
		anatomy.ventriclesMesh.scale.setScalar(1 + ventPulse * 0.13);
		heartPointLight.intensity = 0.7 + ventPulse * 1.9;

		// Ease toward the target brain state instead of snapping. Reduced motion
		// jumps straight to the target so nothing keeps animating.
		if (reducedMotion) {
			displayedColor.copy(targetColor);
			displayedGlow = targetGlow;
		} else {
			const blend = 1 - Math.exp(-delta * 4);
			displayedColor.lerp(targetColor, blend);
			displayedGlow += (targetGlow - displayedGlow) * blend;
		}
		applyBrainMaterial(displayedColor, displayedGlow);

		anatomy.pulseParticles.forEach((pulse) => {
			const t = reducedMotion ? pulse.offset : (elapsed * pulse.speed + pulse.offset) % 1;
			pulse.mesh.position.copy(pulse.curve.getPointAt(t));
		});

		const breath = 1 + Math.sin(elapsed * 1.4) * 0.015 * motion;
		anatomy.skeletonGroup.scale.set(breath, 1, breath);

		controls.update();
		const azimuth = controls.getAzimuthalAngle();
		if (Math.abs(azimuth - lastReportedAzimuth) > 0.005) {
			lastReportedAzimuth = azimuth;
			options.onRotate?.(THREE.MathUtils.radToDeg(azimuth - FRONT_AZIMUTH));
		}

		composer.render();
	}

	resize();
	applyBrainMaterial(displayedColor, displayedGlow);
	frame = requestAnimationFrame(animate);

	const observer =
		typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => resize());
	observer?.observe(canvas);

	const onVisibility = (): void => {
		visible = document.visibilityState === 'visible';
	};
	document.addEventListener('visibilitychange', onVisibility);

	return {
		setRotation,
		setBrain(state: BrainState): void {
			targetColor.set(state.color);
			targetGlow = state.glow;
			if (reducedMotion) {
				displayedColor.set(state.color);
				displayedGlow = state.glow;
				applyBrainMaterial(displayedColor, displayedGlow);
			}
		},
		setHeartRate(value: number | null): void {
			heartRate = value;
		},
		setReducedMotion(value: boolean): void {
			reducedMotion = value;
			controls.enableDamping = !value;
			if (value) {
				displayedColor.copy(targetColor);
				displayedGlow = targetGlow;
				applyBrainMaterial(displayedColor, displayedGlow);
			}
		},
		resize,
		destroy(): void {
			destroyed = true;
			cancelAnimationFrame(frame);
			observer?.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			controls.dispose();
			// Materials and geometries are shared across meshes, so dispose each
			// one once instead of once per mesh that references it.
			const geometries = new Set<THREE.BufferGeometry>();
			const materials = new Set<THREE.Material>();
			scene.traverse((object) => {
				if (
					object instanceof THREE.Mesh ||
					object instanceof THREE.Line ||
					object instanceof THREE.Points
				) {
					geometries.add(object.geometry);
					const material = object.material;
					if (Array.isArray(material)) material.forEach((entry) => materials.add(entry));
					else materials.add(material);
				}
			});
			geometries.forEach((geometry) => geometry.dispose());
			materials.forEach((material) => material.dispose());
			anatomy.textures.forEach((texture) => texture.dispose());
			bloomPass.dispose();
			outputPass.dispose();
			composer.dispose();
			renderer.dispose();
		}
	};
}
