import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

async function main() {
    // const common_name = "wood-poppy";
    // const sci_name = "stylophorum-diphyllum";
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const vertexShader = await (await fetch('shaders/shader.vert')).text();
    const fragmentShader = await (await fetch('shaders/shader.frag')).text();
    const textFragmentShader = await (await fetch('shaders/text-shader.frag')).text();
    const compositeFragmentShader = await (await fetch('shaders/composite.frag')).text();

    const loader = new THREE.TextureLoader();
    const params = new URLSearchParams(window.location.search);
    const common_name = params.get("common") || "wood-poppy";
    const sci_name = params.get("sci") || "stylophorum-diphyllum";
    const imageFile = params.get("img") || "image.png";
    const i = params.get("i") || "";
    const n = params.get("n") || "";
    const counterLabel = i && n ? `${i}/${n}` : "";

    let imageTexture;
    if (imageFile == "image.png") {
        imageTexture = await loader.loadAsync(`images/${imageFile}`);
    }
    else {
        imageTexture = await loader.loadAsync(`images/plant_mode/${imageFile}`);
    }
    
    // const imageTexture = await loader.loadAsync('images/image.png');
    const noiseTexture = await loader.loadAsync('images/noise.png');
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.ClampToEdgeWrapping;

    const textCanvas = document.createElement('canvas');
    const ctx = textCanvas.getContext('2d', { alpha: true });
    const width = window.innerWidth;
    const height = window.innerHeight;
    const fontSize = Math.round(height * 0.015); // ~1.5% of height — tweak as needed

    // const textHeight = 48;
    const textHeight = fontSize * 3.5; // space for both lines + some padding
    const t14_w = fontSize * 0.6; // avg character width for monospace
    textCanvas.width = width;
    textCanvas.height = textHeight;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, textHeight);
    ctx.font = `${fontSize}px "IBM Plex Mono"`;
    ctx.textBaseline = 'top';
    const colors = ['#ff3344', '#33cc99', '#4488ff', '#ffcc33', '#ff66ff', '#00ddff', '#cc44ff', '#99ff44'];

    // const t14_w = 8.4287;

    for (let i = 0; i < 24; i++) {
        const wCommon = common_name.length * t14_w;
        const xCommon = i * wCommon;
        const wSci = sci_name.length * t14_w;
        const xSci = i * wSci;

        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(xCommon, 0, wCommon, fontSize + 4);
        ctx.fillRect(xSci, fontSize + 8, wSci, fontSize + 4);
        
        ctx.fillStyle = '#000001';
        ctx.fillText(common_name, xCommon + 4, 4);
        ctx.fillText(sci_name, xSci + 4, fontSize + 12);
        
        // ctx.fillRect(xCommon, 0, wCommon, 20);
        // ctx.fillRect(xSci, 24, wSci, 20);
        
        // ctx.fillText(common_name, xCommon + 4, 4);
        // ctx.fillText(sci_name, xSci + 4, 28);
    }

    const canvasTexture = new THREE.CanvasTexture(textCanvas);
    canvasTexture.minFilter = THREE.NearestFilter;
    canvasTexture.magFilter = THREE.NearestFilter;

    const resVec2 = new THREE.Vector2(width, height);
    const textRes = new THREE.Vector2(width, textHeight);

    const textRT = new THREE.WebGLRenderTarget(width, height);
    const imageRT = new THREE.WebGLRenderTarget(width, height);

    const quadGeom = new THREE.PlaneGeometry(2, 2);

    // Pass 1: Text Shader
    const textScene = new THREE.Scene();
    const textCam = new THREE.Camera();
    const textMat = new THREE.ShaderMaterial({
        uniforms: {
            u_textTex: { value: canvasTexture },
            u_resolution: { value: textRes }
        },
        vertexShader,
        fragmentShader: textFragmentShader
    });
    const textQuad = new THREE.Mesh(quadGeom, textMat);
    textScene.add(textQuad);

    // Pass 2: Image Shader
    const imageScene = new THREE.Scene();
    const imageCam = new THREE.Camera();
    const imageMat = new THREE.ShaderMaterial({
        uniforms: {
        u_time: { value: 0.0 },
        u_resolution: { value: resVec2 },
        u_texture: { value: imageTexture },
        u_noiseTex: { value: noiseTexture }
        },
        vertexShader,
        fragmentShader
    });
    const imageQuad = new THREE.Mesh(quadGeom, imageMat);
    imageScene.add(imageQuad);

    // Pass 3: Composite Shader
    const compositeScene = new THREE.Scene();
    const compositeCam = new THREE.Camera();
    const compositeMat = new THREE.ShaderMaterial({
        uniforms: {
        u_resolution: { value: resVec2 },
        u_imagePass: { value: imageRT.texture },
        u_textPass: { value: textRT.texture }
        },
        vertexShader,
        fragmentShader: compositeFragmentShader
    });
    const compositeQuad = new THREE.Mesh(quadGeom, compositeMat);
    compositeScene.add(compositeQuad);

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        // const t = clock.getElapsedTime();
        // imageMat.uniforms.u_time.value = t;
        // const scrollSpeed = 50; // px per second
        // const t = clock.getElapsedTime();

        ctx.save();

        // ctx.font = '14px "IBM Plex Mono"';
        ctx.font = `${fontSize}px "IBM Plex Mono"`;
        ctx.textBaseline = 'top';

        // clear text canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, textHeight);

        const scrollSpeed = 50; // px per second
        const t = clock.getElapsedTime();

        const wCommon = common_name.length * t14_w;
        const wSci = sci_name.length * t14_w;

        // TOP: common name scroll
        const scrollCommon = (t * scrollSpeed) % wCommon;
        for (let x = -wCommon; x < width + wCommon; x += wCommon) {
            const xCommon = x - scrollCommon;
            const color = colors[Math.floor((x + scrollCommon) / wCommon) % colors.length];
            ctx.fillStyle = color;
            // ctx.fillRect(xCommon, 0, wCommon, 20);
            ctx.fillRect(xCommon, 0, wCommon, fontSize + 4);
            ctx.fillStyle = '#000001';
            // ctx.fillText(common_name, xCommon + 4, 4);
            ctx.fillText(common_name, xCommon + 4, 4);
        }

        // BOTTOM: sci name scroll
        const scrollSci = (t * scrollSpeed) % wSci;
        for (let x = -wSci; x < width + wSci; x += wSci) {
            const xSci = x - scrollSci;
            const color = colors[Math.floor((x + scrollSci) / wSci) % colors.length];
            ctx.fillStyle = color;
            // ctx.fillRect(xSci, 24, wSci, 20);
            ctx.fillRect(xSci, fontSize + 8, wSci, fontSize + 4);
            ctx.fillStyle = '#000001';
            // ctx.fillText(sci_name, xSci + 4, 28);
            ctx.fillText(sci_name, xSci + 4, fontSize + 12);
        }

        if (counterLabel) {
            ctx.fillStyle = '#000000aa'; // translucent black background
            const padding = 8;
            const boxWidth = ctx.measureText(counterLabel).width + padding * 2;
            const boxHeight = fontSize + padding;
            
            // ctx.fillRect(width - boxWidth - 10, 0, boxWidth, boxHeight);
            // ctx.fillStyle = '#ffffff';
            // ctx.fillText(counterLabel, width - boxWidth + padding - 2, 4);
            const y = textHeight - boxHeight; // draw near top of final image
            ctx.fillRect(width - boxWidth - 10, y, boxWidth, boxHeight);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(counterLabel, width - boxWidth + padding - 2, y + 4);
        }

        ctx.restore();

        canvasTexture.needsUpdate = true;

        renderer.setRenderTarget(textRT);
        renderer.render(textScene, textCam);

        renderer.setRenderTarget(imageRT);
        renderer.render(imageScene, imageCam);

        renderer.setRenderTarget(null);
        renderer.render(compositeScene, compositeCam);
        
        imageMat.uniforms.u_time.value = t;
    }

    animate();
}

main();
