uniform sampler2D u_imagePass;
uniform sampler2D u_textPass;
uniform vec2 u_resolution;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    vec4 image = texture2D(u_imagePass, uv);
    vec4 text = texture2D(u_textPass, uv);

    // Blend using actual alpha
    vec3 finalColor = mix(image.rgb, text.rgb, text.a);
    gl_FragColor = vec4(finalColor, 1.0);
}
