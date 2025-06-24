
async function renderAndSave(width = 3840, height = 2160) {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);

    // Use the same setup from main()
    const vertexShader = await (await fetch('shaders/shader.vert')).text();
    const fragmentShader = await (await fetch('shaders/shader.frag')).text();
    const textFragmentShader = await (await fetch('shaders/text-shader.frag')).text();
    const compositeFragmentShader = await (await fetch('shaders/composite.frag')).text();

    const loader = new THREE.TextureLoader();
    const imageTexture = await loader.loadAsync('images/image.png');
    const noiseTexture = await loader.loadAsync('images/noise.png');
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Build your high-res text canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 64;
    const ctx = canvas.getContext('2d', { alpha: true });
    const common_name = "wood-poppy";
    const sci_name = "stylophorum-diphyllum";
    ctx.font = '28px "IBM Plex Mono"';
    ctx.textBaseline = 'top';
    const colors = ['#ff3344', '#33cc99', '#4488ff', '#ffcc33', '#ff66ff', '#00ddff', '#cc44ff', '#99ff44'];
    const t28_w = 16.8;

    for (let i = 0; i < 24; i++) {
        const wCommon = common_name.length * t28_w;
        const xCommon = i * wCommon;
        const wSci = sci_name.length * t28_w;
        const xSci = i * wSci;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(xCommon, 0, wCommon, 30);
        ctx.fillRect(xSci, 34, wSci, 30);
        ctx.fillStyle = '#000001';
        ctx.fillText(common_name, xCommon + 4, 4);
        ctx.fillText(sci_name, xSci + 4, 38);
    }

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.minFilter = THREE.NearestFilter;
    canvasTexture.magFilter = THREE.NearestFilter;

    const resVec2 = new THREE.Vector2(width, height);
    const textRes = new THREE.Vector2(width, 64);

    const textRT = new THREE.WebGLRenderTarget(width, height);
    const imageRT = new THREE.WebGLRenderTarget(width, height);
    const finalRT = new THREE.WebGLRenderTarget(width, height);

    const quadGeom = new THREE.PlaneGeometry(2, 2);

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
    textScene.add(new THREE.Mesh(quadGeom, textMat));

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
    imageScene.add(new THREE.Mesh(quadGeom, imageMat));

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
    compositeScene.add(new THREE.Mesh(quadGeom, compositeMat));

    // Render steps
    renderer.setRenderTarget(textRT);
    renderer.render(textScene, textCam);

    renderer.setRenderTarget(imageRT);
    renderer.render(imageScene, imageCam);

    renderer.setRenderTarget(finalRT);
    renderer.render(compositeScene, compositeCam);

    renderer.setRenderTarget(null); // Reset

    // Read pixel data
    const pixels = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(finalRT, 0, 0, width, height, pixels);

    // Create a canvas to export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext('2d');
    const imgData = exportCtx.createImageData(width, height);

    // Flip Y while copying
    for (let y = 0; y < height; y++) {
        const srcStart = (height - y - 1) * width * 4;
        const dstStart = y * width * 4;
        imgData.data.set(pixels.slice(srcStart, srcStart + width * 4), dstStart);
    }

    exportCtx.putImageData(imgData, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    link.download = 'output.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}
