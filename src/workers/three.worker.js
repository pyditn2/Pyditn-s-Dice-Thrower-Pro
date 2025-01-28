import * as THREE from 'three';

// State variables
let scene = null;
let camera = null;
let renderer = null;
let clock = null;
let shapes = [];
let circleGroup = null;
let isAnimating = false;
let rotationSpeed = 0.005 / 2;

// Configuration
const config = {
    hexagonColor: 0xffffff,
    squareColor: 0xffffff,
    debug: true
};

// Debug logger
function debugLog(...args) {
    if (config.debug) {
        console.log('[Worker]', ...args);
    }
}

// Error handler
function handleError(error, context) {
    console.error(`[Worker Error] ${context}:`, error);
    self.postMessage({ type: 'error', message: error.message });
}

// Initialization
function initScene(data) {
    try {
        debugLog('InitScene started with data:', data);

        if (!data.canvas) throw new Error('No canvas provided');
        if (!data.width || !data.height) throw new Error('Invalid dimensions');

        const { canvas, width, height, dpr } = data;
        debugLog('Canvas received:', canvas);
        debugLog(`Resolution: ${width}x${height} @ ${dpr}dpr`);

        // WebGL context creation
        const contextAttributes = {
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        };

        let context = null;
        try {
            context = canvas.getContext('webgl2', contextAttributes) ||
                canvas.getContext('webgl', contextAttributes);
        } catch (error) {
            throw new Error(`WebGL context creation failed: ${error.message}`);
        }

        if (!context) {
            throw new Error('WebGL is not supported in this browser');
        }

        debugLog('WebGL context created:', context);

        // Renderer setup
        try {
            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                context: context,
                antialias: true,
                alpha: true
            });
        } catch (error) {
            throw new Error(`Renderer initialization failed: ${error.message}`);
        }

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(1);
        debugLog('Renderer initialized:', renderer);

        // Scene setup
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(10, width / height, 0.1, 1000);

        camera = new THREE.PerspectiveCamera(10, width / height, 0.1, 1000);
        camera.position.set(0, -30, 600);
        debugLog('Camera initialized:', camera);

        // Lighting setup
        try {
            setupLights();
            setupShapes();
        } catch (error) {
            throw new Error(`Scene setup failed: ${error.message}`);
        }
        circleGroup.position.set(0, 0, 0);
        // Initialize animation clock
        clock = new THREE.Clock();
        debugLog('Scene initialization complete');
    } catch (error) {
        handleError(error, 'Scene initialization');
    }
}

function setupLights() {
    debugLog('Setting up lights...');

    // Key light (RectAreaLight) - Keep existing code
    const keyLight = new THREE.RectAreaLight(0xffffff, 40, 1000, 1000);
    keyLight.position.set(400, 400, 200);
    keyLight.lookAt(0, 60, 0);
    scene.add(keyLight);

    // Front-facing spotlight (camera following)
    const frontSpotLight = new THREE.SpotLight(0xffffff, 100);
    frontSpotLight.angle = Math.PI / 4;
    frontSpotLight.penumbra = 0.2;
    frontSpotLight.decay = 0.5;
    frontSpotLight.distance = 1500;

    // Create and add front light target
    const frontTarget = new THREE.Object3D();
    frontTarget.position.set(0, 60, 0);
    scene.add(frontTarget);
    frontSpotLight.target = frontTarget;
    scene.add(frontSpotLight);

    // Ambient light - Keep existing code
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    // Store references for animation updates
    scene.userData.lights = {
        frontSpotLight,
        frontTarget,
        keyLight
    };
    debugLog('Lights setup complete');
}

function setupShapes() {
    debugLog('Creating shapes...');

    circleGroup = new THREE.Group();
    circleGroup.position.y = 60;
    scene.add(circleGroup);

    const numShapes = 40;
    const radius = 120;

    for (let i = 0; i < numShapes; i++) {
        try {
            const isHexagon = i % 2 === 0;
            const geometry = isHexagon ?
                new THREE.IcosahedronGeometry(4) :
                new THREE.BoxGeometry(6, 6, 6);

            const material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(isHexagon ? config.hexagonColor : config.squareColor),
                metalness: 0.9,
                roughness: 0.1,
                clearcoat: 1.0,
                clearcoatRoughness: 0.01,
                reflectivity: 1,
                envMapIntensity: 1.0
            });

            const mesh = new THREE.Mesh(geometry, material);
            const eachRotation = 0.0003;
            mesh.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * eachRotation,
                y: (Math.random() - 0.5) * eachRotation,
                z: (Math.random() - 0.5) * eachRotation
            };

            const angle = (i / numShapes) * Math.PI * 2;
            mesh.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0
            );

            // Create individual spotlight for this shape
            const { light, target } = createHighlightLight(mesh.position);
            scene.add(light);
            mesh.userData.lightTarget = target;

            circleGroup.add(mesh);
            shapes.push(mesh);

        } catch (error) {
            handleError(error, `Shape creation (index ${i})`);
        }
    }
    debugLog(`${shapes.length} shapes created`);
}



function updateLights() {
    if (!scene.userData.lights) return;

    const { frontSpotLight, frontTarget } = scene.userData.lights;

    // Update camera-following light position
    frontSpotLight.position.copy(camera.position);
    frontSpotLight.position.y += 50;
    frontTarget.position.set(0, 60, 0);

    // Update individual shape light targets
    shapes.forEach(shape => {
        if (shape.userData.lightTarget) {
            const worldPos = new THREE.Vector3();
            shape.getWorldPosition(worldPos);
            shape.userData.lightTarget.position.copy(worldPos);
        }
    });
}


// Message handler
self.onmessage = function (e) {
    try {
        debugLog('Message received:', e.data.type);

        switch (e.data.type) {
            case 'init':
                if (!e.data.canvas) {
                    throw new Error('Init message missing canvas');
                }
                initScene(e.data);
                break;

            case 'resize':
                if (!camera || !renderer) break;

                // Update renderer size first
                renderer.setSize(e.data.width, e.data.height, false);

                // Update camera aspect ratio
                camera.aspect = e.data.width / e.data.height;
                camera.updateProjectionMatrix();

                // Reset camera position to original values (no horizontal offset)
                camera.position.set(0, -30, 600);
                camera.lookAt(0, 60, 0);

                debugLog(`Resized to ${e.data.width}x${e.data.height}`);
                break;

            case 'animate':
                isAnimating = Boolean(e.data.value);
                debugLog(`Animation ${isAnimating ? 'started' : 'stopped'}`);
                if (isAnimating) requestAnimationFrame(animate);
                break;

            case 'colors':
                config.hexagonColor = new THREE.Color(e.data.hex).getHex();
                config.squareColor = new THREE.Color(e.data.square).getHex();
                updateMaterialColors();
                debugLog('Colors updated');
                break;

            default:
                throw new Error(`Unknown message type: ${e.data.type}`);
        }
    } catch (error) {
        handleError(error, 'Message handling');
    }
};

// Animation loop
function animate() {
    try {
        if (!isAnimating || !scene || !camera || !renderer) return;

        const delta = clock.getDelta();

        // Keep group centered
        circleGroup.position.set(0, 60, 0);

        updateLights();

        circleGroup.rotation.z += rotationSpeed * delta * Math.PI * 2;

        shapes.forEach(shape => {
            shape.rotation.x += shape.userData.rotationSpeed.x;
            shape.rotation.y += shape.userData.rotationSpeed.y;
            shape.rotation.z += shape.userData.rotationSpeed.z;
        });

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    } catch (error) {
        handleError(error, 'Animation loop');
        isAnimating = false;
    }
}

// Helper functions
function createHighlightLight(position) {
    const light = new THREE.SpotLight(0xffffff, 150);
    light.position.set(400, 400, 200);
    light.angle = Math.PI / 6;
    light.penumbra = 0.1;
    light.decay = 0.5;
    light.distance = 1500;

    // Create and add target object to scene
    const target = new THREE.Object3D();
    target.position.copy(position);
    scene.add(target);
    light.target = target;

    light.castShadow = false;
    scene.add(light);

    return { light, target };
}

function updateMaterialColors() {
    shapes.forEach((shape, index) => {
        const isHexagon = index % 2 === 0;
        shape.material.color.setHex(isHexagon ? config.hexagonColor : config.squareColor);
    });
}

// Cleanup
function cleanup() {
    debugLog('Cleaning up resources...');
    shapes.forEach(shape => {
        shape.geometry.dispose();
        shape.material.dispose();
    });
    renderer?.dispose();
    scene = null;
    camera = null;
    debugLog('Cleanup complete');
}

// Initialization complete
debugLog('Worker script loaded');