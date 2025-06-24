uniform sampler2D u_textTex;
uniform vec2 u_resolution;

varying vec2 vUv;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Only render the text in the bottom 64 pixels
    // float cutoff = 64.0 / u_resolution.y;
    float cutoff = 1.0; // render the whole vertical span of texture

    if (uv.y > cutoff) {
        gl_FragColor = vec4(0.0); // fully transparent
        return;
    }

    // Normalize within the text strip
    vec2 textUV = vec2(uv.x, uv.y / cutoff);

    // Sample text texture
    vec4 texel = texture2D(u_textTex, textUV);
    // If pixel is not part of a colored block or text, make it transparent
    // Consider any pixel with low RGB *and* alpha as empty space
    if (texel.a < 0.05 || texel.rgb == vec3(0.0)) {
        gl_FragColor = vec4(0.0); // fully transparent
    } else {
        gl_FragColor = texel;
    }
    // gl_FragColor = texel;
}
