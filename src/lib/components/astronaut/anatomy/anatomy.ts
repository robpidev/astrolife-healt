import * as THREE from 'three';

/**
 * One-to-one port of the anatomy shown in the reference HTML. Coordinates,
 * profiles, shader uniforms and material values are copied unchanged; only the
 * types and the texture ownership were added so the scene can dispose them.
 */

interface TorsoRing {
	y: number;
	cx: number;
	cz: number;
	rx: number;
	rz: number;
	mod?: (theta: number) => number;
}

export interface PulseParticle {
	mesh: THREE.Mesh;
	curve: THREE.CatmullRomCurve3;
	color: number;
	speed: number;
	offset: number;
}

export interface Anatomy {
	root: THREE.Group;
	fresnelMaterial: THREE.ShaderMaterial;
	skeletonGroup: THREE.Group;
	vesselsGroup: THREE.Group;
	heartGroup: THREE.Group;
	ventriclesMesh: THREE.Mesh;
	atriaGroup: THREE.Group;
	brainGroup: THREE.Group;
	brainMaterial: THREE.MeshStandardMaterial;
	pulseParticles: PulseParticle[];
	textures: THREE.Texture[];
}

function canvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas context is unavailable');
	return ctx;
}

function createBrainTexture(): THREE.CanvasTexture {
	const size = 512;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvasContext(canvas);

	ctx.fillStyle = '#e598aa';
	ctx.fillRect(0, 0, size, size);

	// Draw subtle sulci and capillaries.
	for (let i = 0; i < 240; i++) {
		ctx.beginPath();
		let x = Math.random() * size;
		let y = Math.random() * size;
		ctx.moveTo(x, y);
		for (let s = 0; s < 7; s++) {
			x += (Math.random() - 0.5) * 48;
			y += (Math.random() - 0.5) * 48;
			ctx.lineTo(x, y);
		}
		ctx.strokeStyle = i % 4 === 0 ? 'rgba(130, 30, 60, 0.32)' : 'rgba(175, 85, 110, 0.25)';
		ctx.lineWidth = i % 4 === 0 ? 1.4 : 3.2;
		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

function createHeartTexture(): THREE.CanvasTexture {
	const size = 256;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvasContext(canvas);

	ctx.fillStyle = '#b91c1c';
	ctx.fillRect(0, 0, size, size);

	// Myocardial fibres.
	for (let i = 0; i < 320; i++) {
		const y = Math.random() * size;
		ctx.strokeStyle = i % 2 === 0 ? 'rgba(248, 113, 113, 0.16)' : 'rgba(69, 10, 10, 0.22)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.bezierCurveTo(size * 0.33, y + 12, size * 0.66, y - 12, size, y + 4);
		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

/** Builds a continuous organic mesh from transverse rings. */
function createLoftedGeometry(rings: readonly TorsoRing[], radialSegs = 40): THREE.BufferGeometry {
	const positions: number[] = [];
	const indices: number[] = [];
	const cols = radialSegs + 1;

	for (let j = 0; j < rings.length; j++) {
		const r = rings[j];
		for (let i = 0; i <= radialSegs; i++) {
			const theta = (i / radialSegs) * Math.PI * 2;
			const sinT = Math.sin(theta);
			const cosT = Math.cos(theta);

			// Optional anatomical modulation (chest/back).
			const mod = r.mod ? r.mod(theta) : 1.0;
			const x = r.cx + sinT * r.rx * mod;
			const z = r.cz + cosT * r.rz * mod;
			positions.push(x, r.y, z);
		}
	}

	for (let j = 0; j < rings.length - 1; j++) {
		for (let i = 0; i < radialSegs; i++) {
			const a = j * cols + i;
			const b = j * cols + i + 1;
			const c = (j + 1) * cols + i + 1;
			const d = (j + 1) * cols + i;
			indices.push(a, b, d);
			indices.push(b, c, d);
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geo.setIndex(indices);
	geo.computeVertexNormals();

	// Smooth normals on the theta=0 / 2PI seam.
	const norm = geo.attributes.normal;
	for (let j = 0; j < rings.length; j++) {
		const i0 = j * cols;
		const iLast = j * cols + radialSegs;
		const nx = (norm.getX(i0) + norm.getX(iLast)) * 0.5;
		const ny = (norm.getY(i0) + norm.getY(iLast)) * 0.5;
		const nz = (norm.getZ(i0) + norm.getZ(iLast)) * 0.5;
		const len = Math.hypot(nx, ny, nz) || 1;
		norm.setXYZ(i0, nx / len, ny / len, nz / len);
		norm.setXYZ(iLast, nx / len, ny / len, nz / len);
	}
	norm.needsUpdate = true;
	return geo;
}

/** Builds organic limbs following a 3D curve with a radius profile. */
function createLimbGeometry(
	curve: THREE.CatmullRomCurve3,
	radiusFn: (t: number) => number,
	tubularSegs = 44,
	radialSegs = 24
): THREE.BufferGeometry {
	const frames = curve.computeFrenetFrames(tubularSegs, false);
	const positions: number[] = [];
	const indices: number[] = [];
	const cols = radialSegs + 1;

	for (let j = 0; j <= tubularSegs; j++) {
		const t = j / tubularSegs;
		const p = curve.getPointAt(t);
		const N = frames.normals[j];
		const B = frames.binormals[j];
		const r = radiusFn(t);

		for (let i = 0; i <= radialSegs; i++) {
			const theta = (i / radialSegs) * Math.PI * 2;
			const sinT = Math.sin(theta);
			const cosT = Math.cos(theta);
			const vx = p.x + r * (cosT * N.x + sinT * B.x);
			const vy = p.y + r * (cosT * N.y + sinT * B.y);
			const vz = p.z + r * (cosT * N.z + sinT * B.z);
			positions.push(vx, vy, vz);
		}
	}

	for (let j = 0; j < tubularSegs; j++) {
		for (let i = 0; i < radialSegs; i++) {
			const a = j * cols + i;
			const b = j * cols + i + 1;
			const c = (j + 1) * cols + i + 1;
			const d = (j + 1) * cols + i;
			indices.push(a, d, b);
			indices.push(b, d, c);
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geo.setIndex(indices);
	geo.computeVertexNormals();
	return geo;
}

export function createAdvancedHumanAnatomy(): Anatomy {
	const root = new THREE.Group();

	// Holographic Fresnel skin shader.
	const fresnelMaterial = new THREE.ShaderMaterial({
		uniforms: {
			uRimColor: { value: new THREE.Color(0x38bdf8) },
			uCoreColor: { value: new THREE.Color(0x082f49) },
			uOpacity: { value: 0.28 },
			uRimPower: { value: 2.5 }
		},
		vertexShader: /* glsl */ `
			varying vec3 vNormalW;
			varying vec3 vViewDirW;
			varying vec3 vWorldPos;
			void main() {
				vec4 wp = modelMatrix * vec4(position, 1.0);
				vWorldPos = wp.xyz;
				vNormalW = normalize(mat3(modelMatrix) * normal);
				vViewDirW = normalize(cameraPosition - wp.xyz);
				gl_Position = projectionMatrix * viewMatrix * wp;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uRimColor;
			uniform vec3 uCoreColor;
			uniform float uOpacity;
			uniform float uRimPower;
			varying vec3 vNormalW;
			varying vec3 vViewDirW;
			varying vec3 vWorldPos;
			void main() {
				vec3 n = normalize(vNormalW);
				vec3 v = normalize(vViewDirW);
				float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
				float fresnel = pow(1.0 - ndv, uRimPower);
				float scan = 0.94 + 0.06 * sin(vWorldPos.y * 120.0);
				vec3 color = mix(uCoreColor, uRimColor, fresnel) * scan;
				float alpha = clamp(uOpacity * 0.28 + fresnel * (uOpacity * 2.1 + 0.14), 0.0, 0.92);
				gl_FragColor = vec4(color, alpha);
			}
		`,
		transparent: true,
		depthWrite: false,
		side: THREE.FrontSide
	});

	const bodyGroup = new THREE.Group();

	// Torso + pelvis + shoulders + neck in one continuous mesh.
	const torsoProfile: TorsoRing[] = [
		{ y: 0.83, cx: 0, cz: -0.01, rx: 0.06, rz: 0.05 },
		{ y: 0.88, cx: 0, cz: -0.01, rx: 0.145, rz: 0.098 }, // Low pelvis
		{ y: 0.95, cx: 0, cz: -0.005, rx: 0.162, rz: 0.105 }, // Hips
		{ y: 1.03, cx: 0, cz: 0.005, rx: 0.142, rz: 0.095 }, // Low waist
		{ y: 1.11, cx: 0, cz: 0.012, rx: 0.136, rz: 0.095 }, // Waist
		{ y: 1.22, cx: 0, cz: 0.015, rx: 0.162, rz: 0.115 }, // Lower ribs
		{
			y: 1.32,
			cx: 0,
			cz: 0.012,
			rx: 0.185,
			rz: 0.122, // Pectorals / thorax
			mod: (t) => 1 + 0.05 * Math.max(0, Math.cos(t)) * (1 - 0.5 * Math.cos(2 * t))
		},
		{ y: 1.41, cx: 0, cz: 0.0, rx: 0.21, rz: 0.102 }, // Shoulders
		{ y: 1.46, cx: 0, cz: -0.008, rx: 0.115, rz: 0.075 }, // Trapezius
		{ y: 1.5, cx: 0, cz: -0.01, rx: 0.058, rz: 0.058 }, // Neck base
		{ y: 1.57, cx: 0, cz: -0.005, rx: 0.053, rz: 0.055 } // High neck
	];
	const torsoMesh = new THREE.Mesh(createLoftedGeometry(torsoProfile, 48), fresnelMaterial);
	torsoMesh.renderOrder = 3;
	bodyGroup.add(torsoMesh);

	// Sculpted head (skull + jaw + facial profile).
	const headGeo = new THREE.SphereGeometry(0.104, 48, 48);
	const hp = headGeo.attributes.position;
	const hv = new THREE.Vector3();
	for (let i = 0; i < hp.count; i++) {
		hv.fromBufferAttribute(hp, i);
		hv.y *= 1.22;
		hv.x *= 0.84;
		hv.z *= 1.02;
		// Narrow the lower jaw and project chin/nose slightly.
		if (hv.y < 0) {
			const k = Math.max(0.55, 1 + hv.y * 2.8);
			hv.x *= k;
			if (hv.z > 0) hv.z *= 0.92;
		}
		// Subtle nasal bridge and brow ridge.
		if (hv.z > 0.06 && Math.abs(hv.x) < 0.025 && hv.y > -0.03 && hv.y < 0.02) {
			hv.z += 0.014 * Math.cos((hv.y + 0.005) * 60);
		}
		hp.setXYZ(i, hv.x, hv.y, hv.z);
	}
	headGeo.computeVertexNormals();
	const headMesh = new THREE.Mesh(headGeo, fresnelMaterial);
	headMesh.position.set(0, 1.675, 0.008);
	headMesh.renderOrder = 3;
	bodyGroup.add(headMesh);

	// Continuous anatomical arms (left / right).
	[-1, 1].forEach((side) => {
		const armCurve = new THREE.CatmullRomCurve3([
			new THREE.Vector3(side * 0.165, 1.4, -0.005),
			new THREE.Vector3(side * 0.225, 1.36, -0.005), // Deltoid
			new THREE.Vector3(side * 0.25, 1.15, -0.02), // Elbow
			new THREE.Vector3(side * 0.27, 0.95, 0.032), // Forearm
			new THREE.Vector3(side * 0.285, 0.8, 0.065) // Wrist / hand
		]);
		const armGeo = createLimbGeometry(armCurve, (t) => {
			if (t < 0.22) return 0.056 - t * 0.04; // Shoulder / biceps
			if (t < 0.55) return 0.047 - (t - 0.22) * 0.025;
			if (t < 0.88) return 0.039 - (t - 0.55) * 0.035;
			return 0.028 * (1 - (t - 0.88) * 3.5); // Tapered hand
		});
		const armMesh = new THREE.Mesh(armGeo, fresnelMaterial);
		armMesh.renderOrder = 3;
		bodyGroup.add(armMesh);
	});

	// Continuous anatomical legs (left / right).
	[-1, 1].forEach((side) => {
		const legCurve = new THREE.CatmullRomCurve3([
			new THREE.Vector3(side * 0.098, 0.9, 0.0),
			new THREE.Vector3(side * 0.105, 0.68, 0.008), // Thigh
			new THREE.Vector3(side * 0.095, 0.47, 0.004), // Knee
			new THREE.Vector3(side * 0.092, 0.25, -0.015), // Calf
			new THREE.Vector3(side * 0.092, 0.04, 0.0) // Ankle
		]);
		const legGeo = createLimbGeometry(legCurve, (t) => {
			if (t < 0.25) return 0.082 - t * 0.05;
			if (t < 0.5) return 0.07 - (t - 0.25) * 0.06; // Knee
			if (t < 0.72) return 0.055 + Math.sin((t - 0.5) * Math.PI * 3.5) * 0.008; // Calf
			return Math.max(0.032, 0.052 - (t - 0.72) * 0.07);
		});
		const legMesh = new THREE.Mesh(legGeo, fresnelMaterial);
		legMesh.renderOrder = 3;
		bodyGroup.add(legMesh);

		// Stylised foot.
		const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.11, 10, 18), fresnelMaterial);
		foot.position.set(side * 0.092, 0.025, 0.045);
		foot.rotation.x = Math.PI / 2;
		foot.scale.set(1.05, 1, 0.6);
		foot.renderOrder = 3;
		bodyGroup.add(foot);
	});

	root.add(bodyGroup);

	// Translucent skeleton (spine, ribs and sternum).
	const skeletonGroup = new THREE.Group();
	const boneMaterial = new THREE.MeshPhysicalMaterial({
		color: 0xcbeafe,
		transparent: true,
		opacity: 0.2,
		roughness: 0.35,
		depthWrite: false
	});

	// Spine (20 vertebrae following an S curve).
	const spineCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0, 0.9, -0.045),
		new THREE.Vector3(0, 1.08, -0.025),
		new THREE.Vector3(0, 1.3, -0.055),
		new THREE.Vector3(0, 1.48, -0.028),
		new THREE.Vector3(0, 1.6, -0.015)
	]);
	for (let i = 0; i < 20; i++) {
		const t = i / 19;
		const pos = spineCurve.getPointAt(t);
		const vert = new THREE.Mesh(
			new THREE.CylinderGeometry(0.018 - t * 0.006, 0.019 - t * 0.006, 0.024, 12),
			boneMaterial
		);
		vert.position.copy(pos);
		vert.renderOrder = 2;
		skeletonGroup.add(vert);
	}

	// 9 pairs of ribs wrapping the thorax and shielding the heart.
	for (let r = 0; r < 9; r++) {
		const frac = r / 8;
		const yBack = 1.39 - frac * 0.23;
		const yFront = yBack - 0.028;
		const width = 0.095 + Math.sin(frac * Math.PI * 0.85) * 0.052;
		const zBack = -0.052;
		const zFront = 0.082 - Math.abs(frac - 0.45) * 0.02;

		[-1, 1].forEach((side) => {
			const ribCurve = new THREE.CatmullRomCurve3([
				new THREE.Vector3(side * 0.014, yBack, zBack),
				new THREE.Vector3(side * width * 0.72, yBack - 0.008, zBack + 0.025),
				new THREE.Vector3(side * width, (yBack + yFront) * 0.5, 0.015),
				new THREE.Vector3(side * width * 0.65, yFront, zFront - 0.012),
				new THREE.Vector3(side * (r > 6 ? 0.045 : 0.014), yFront + (r > 6 ? 0.02 : 0), zFront)
			]);
			const rib = new THREE.Mesh(
				new THREE.TubeGeometry(ribCurve, 20, 0.0042, 8, false),
				boneMaterial
			);
			rib.renderOrder = 2;
			skeletonGroup.add(rib);
		});
	}

	// Sternum.
	const sternum = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.14, 8, 12), boneMaterial);
	sternum.position.set(0, 1.3, 0.085);
	sternum.rotation.x = -0.1;
	sternum.scale.set(1.2, 1, 0.45);
	sternum.renderOrder = 2;
	skeletonGroup.add(sternum);

	root.add(skeletonGroup);

	// Detailed brain (textured cortex + gyri).
	const brainGroup = new THREE.Group();
	brainGroup.position.set(0, 1.695, 0.004);

	const brainTex = createBrainTexture();
	const brainMaterial = new THREE.MeshStandardMaterial({
		map: brainTex,
		bumpMap: brainTex,
		bumpScale: 0.006,
		color: 0xffb3c6,
		roughness: 0.42,
		metalness: 0.06,
		emissive: 0x3b0764,
		emissiveIntensity: 0.25
	});

	function buildHemisphere(side: number): THREE.Mesh {
		const geo = new THREE.SphereGeometry(0.056, 64, 64);
		const pos = geo.attributes.position;
		const v = new THREE.Vector3();

		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			// Flatten the medial face (longitudinal fissure).
			if (side < 0 && v.x > 0) v.x *= 0.1;
			if (side > 0 && v.x < 0) v.x *= 0.1;

			// Anatomical shape (narrow frontal lobe, rounded occipital, lower temporal).
			v.z *= 1.35;
			v.y *= 0.92;
			if (v.z > 0.01) v.x *= 0.86;
			if (v.y < -0.015 && v.z > -0.02 && v.z < 0.03) {
				v.x *= 1.12; // Temporal lobe
			}

			// Multi-frequency folds (gyri / sulci).
			const f1 = Math.sin(v.x * 145 + v.z * 95) * Math.cos(v.y * 135 - v.z * 80);
			const f2 = Math.sin(v.z * 210 - v.y * 160) * Math.cos(v.x * 190 + v.y * 110);
			const disp = (f1 * 0.65 + f2 * 0.35) * 0.0036;
			v.addScaledVector(v.clone().normalize(), disp);
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		geo.computeVertexNormals();
		const mesh = new THREE.Mesh(geo, brainMaterial);
		mesh.position.x = side * 0.027;
		mesh.renderOrder = 1;
		return mesh;
	}

	brainGroup.add(buildHemisphere(-1));
	brainGroup.add(buildHemisphere(1));

	// Cerebellum.
	const cerebellum = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 32), brainMaterial);
	cerebellum.scale.set(1.4, 0.72, 0.85);
	cerebellum.position.set(0, -0.044, -0.044);
	cerebellum.renderOrder = 1;
	brainGroup.add(cerebellum);

	// Brain stem.
	const brainStem = new THREE.Mesh(
		new THREE.CylinderGeometry(0.013, 0.008, 0.075, 16),
		brainMaterial
	);
	brainStem.position.set(0, -0.076, -0.016);
	brainStem.rotation.x = 0.24;
	brainStem.renderOrder = 1;
	brainGroup.add(brainStem);

	root.add(brainGroup);

	// Anatomical heart (ventricles, atria, aorta, coronaries).
	const heartGroup = new THREE.Group();
	heartGroup.position.set(0.028, 1.265, 0.022);
	heartGroup.rotation.set(0.14, 0.12, 0.36);

	const heartTex = createHeartTexture();
	const heartMaterial = new THREE.MeshStandardMaterial({
		map: heartTex,
		bumpMap: heartTex,
		bumpScale: 0.003,
		color: 0xe11d48,
		roughness: 0.26,
		metalness: 0.08,
		emissive: 0x6b021a,
		emissiveIntensity: 0.42
	});

	const arteryMat = new THREE.MeshStandardMaterial({
		color: 0xf43f5e,
		roughness: 0.3,
		emissive: 0x4c0519,
		emissiveIntensity: 0.3
	});

	const veinMat = new THREE.MeshStandardMaterial({
		color: 0x3b82f6,
		roughness: 0.35,
		emissive: 0x172554,
		emissiveIntensity: 0.35
	});

	// Sculpted ventricles.
	const ventriclesGeo = new THREE.SphereGeometry(0.045, 48, 48);
	const vp = ventriclesGeo.attributes.position;
	const vv = new THREE.Vector3();
	for (let i = 0; i < vp.count; i++) {
		vv.fromBufferAttribute(vp, i);
		if (vv.y < 0) {
			const taper = Math.max(0.24, 1 + vv.y * 10.5);
			vv.x *= taper;
			vv.z *= taper;
		}
		vv.y *= 1.32;
		vv.z *= 0.84;
		// Slight interventricular groove.
		const groove = Math.exp(-Math.pow((vv.x - 0.005) / 0.01, 2)) * 0.003;
		vv.z -= Math.sign(vv.z) * groove;
		vp.setXYZ(i, vv.x, vv.y, vv.z);
	}
	ventriclesGeo.computeVertexNormals();
	const ventriclesMesh = new THREE.Mesh(ventriclesGeo, heartMaterial);
	ventriclesMesh.renderOrder = 1;
	heartGroup.add(ventriclesMesh);

	// Atria with independent animation.
	const atriaGroup = new THREE.Group();
	const rightAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 24), heartMaterial);
	rightAtrium.position.set(-0.024, 0.032, 0.006);
	const leftAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 24), heartMaterial);
	leftAtrium.position.set(0.02, 0.036, -0.012);
	atriaGroup.add(rightAtrium, leftAtrium);
	heartGroup.add(atriaGroup);

	// Aortic arch + 3 upper branches.
	const aortaCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0.0, 0.028, 0.005),
		new THREE.Vector3(0.004, 0.072, 0.002),
		new THREE.Vector3(0.018, 0.085, -0.014),
		new THREE.Vector3(0.016, 0.02, -0.028)
	]);
	const aortaMesh = new THREE.Mesh(
		new THREE.TubeGeometry(aortaCurve, 28, 0.0105, 14, false),
		arteryMat
	);
	aortaMesh.renderOrder = 1;
	heartGroup.add(aortaMesh);

	// Aortic arch branches (carotid / subclavian stubs).
	[-0.006, 0.006, 0.016].forEach((bx, idx) => {
		const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0042, 0.026, 10), arteryMat);
		branch.position.set(bx, 0.092 - idx * 0.002, -0.004 - idx * 0.005);
		branch.rotation.z = -0.25;
		heartGroup.add(branch);
	});

	// Pulmonary trunk.
	const pulmCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(-0.006, 0.025, 0.022),
		new THREE.Vector3(-0.002, 0.056, 0.012),
		new THREE.Vector3(0.022, 0.062, -0.006)
	]);
	heartGroup.add(new THREE.Mesh(new THREE.TubeGeometry(pulmCurve, 18, 0.0085, 12, false), veinMat));

	// Superior vena cava.
	const svc = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.055, 12), veinMat);
	svc.position.set(-0.026, 0.062, -0.004);
	svc.rotation.z = 0.15;
	heartGroup.add(svc);

	// Coronary artery hugging the ventricular surface.
	const coronaryCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(-0.005, 0.028, 0.032),
		new THREE.Vector3(0.005, 0.002, 0.038),
		new THREE.Vector3(0.006, -0.028, 0.026),
		new THREE.Vector3(0.002, -0.048, 0.012)
	]);
	const coronary = new THREE.Mesh(
		new THREE.TubeGeometry(coronaryCurve, 20, 0.0022, 8, false),
		new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0x9f1239, emissiveIntensity: 0.7 })
	);
	heartGroup.add(coronary);

	root.add(heartGroup);

	// Vascular and neural link heart ↔ brain.
	const vesselsGroup = new THREE.Group();
	const pulsePaths: Omit<PulseParticle, 'mesh'>[] = [];

	const carotidMat = new THREE.MeshStandardMaterial({
		color: 0xf43f5e,
		transparent: true,
		opacity: 0.75,
		emissive: 0x881337,
		emissiveIntensity: 0.45
	});

	const neuralMat = new THREE.MeshStandardMaterial({
		color: 0x38bdf8,
		transparent: true,
		opacity: 0.72,
		emissive: 0x0284c7,
		emissiveIntensity: 0.85
	});

	// Carotid arteries (rising from the heart to the brain).
	[-1, 1].forEach((side) => {
		const cCurve = new THREE.CatmullRomCurve3([
			new THREE.Vector3(0.02, 1.345, 0.01),
			new THREE.Vector3(side * 0.025, 1.44, 0.004),
			new THREE.Vector3(side * 0.024, 1.56, 0.002),
			new THREE.Vector3(side * 0.022, 1.65, 0.005)
		]);
		const cMesh = new THREE.Mesh(new THREE.TubeGeometry(cCurve, 28, 0.0034, 8, false), carotidMat);
		cMesh.renderOrder = 1;
		vesselsGroup.add(cMesh);
		pulsePaths.push({
			curve: cCurve,
			color: 0xff4d6d,
			speed: 0.65,
			offset: side > 0 ? 0 : 0.35
		});
	});

	// Spinal cord / vagus nerve (links brain, heart and spine).
	const spinalCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0, 1.63, -0.012),
		new THREE.Vector3(0, 1.5, -0.026),
		new THREE.Vector3(0, 1.32, -0.05),
		new THREE.Vector3(0, 1.1, -0.025),
		new THREE.Vector3(0, 0.94, -0.042)
	]);
	const spinalMesh = new THREE.Mesh(
		new THREE.TubeGeometry(spinalCurve, 32, 0.0042, 10, false),
		neuralMat
	);
	spinalMesh.renderOrder = 1;
	vesselsGroup.add(spinalMesh);
	pulsePaths.push({ curve: spinalCurve, color: 0x7dd3fc, speed: 0.85, offset: 0.1 });
	pulsePaths.push({ curve: spinalCurve, color: 0x7dd3fc, speed: 0.85, offset: 0.6 });

	// Bioelectric / blood pulses travelling along the curves.
	const pulseParticles: PulseParticle[] = pulsePaths.map((cfg) => {
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.0068, 12, 12),
			new THREE.MeshBasicMaterial({ color: cfg.color })
		);
		sphere.renderOrder = 1;
		vesselsGroup.add(sphere);
		return { mesh: sphere, ...cfg };
	});

	root.add(vesselsGroup);

	return {
		root,
		fresnelMaterial,
		skeletonGroup,
		vesselsGroup,
		heartGroup,
		ventriclesMesh,
		atriaGroup,
		brainGroup,
		brainMaterial,
		pulseParticles,
		textures: [brainTex, heartTex]
	};
}
