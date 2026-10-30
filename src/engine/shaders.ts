/**
 * GLSL shader 源码
 * 五段管线：景深 → 主调色 → 分离模糊 → 合成 → 颗粒
 */

/** 全屏三角形顶点着色器 */
export const VERT = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  // 不翻转 v 轴：每经过一次「渲染到 FBO 再采样」就等价于一次 Y 翻转，
  // 当前管线共 8 次绘制（7 次 FBO + 1 次屏幕），翻转次数为偶数。
  // 若在此处翻转，总次数变为奇数，画面会上下颠倒。
  // 源纹理的方向在 setSource 中通过 UNPACK_FLIP_Y_WEBGL 统一处理。
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

/** 公共 GLSL 片段：色彩空间与工具函数 */
const COMMON = `
precision highp float;

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
`

/**
 * Pass 0 —— 景深模糊源
 * 用径向 + 垂直梯度近似深度图，对焦平面外做模糊
 */
export const FRAG_DOF = `#version 300 es
${COMMON}
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uAperture;   // f 值，越小景深越浅
uniform float uFocal;      // 焦距 / 50
uniform float uFocusDist;  // 对焦距离
uniform float uSoftness;
uniform int uBokehShape;

void main() {
  vec4 src = texture(uTex, vUv);
  vec2 centered = vUv - 0.5;

  // 深度近似：垂直梯度（上方远）+ 径向衰减
  float radial = dot(centered, centered) * 2.0;
  float vertical = clamp((0.5 - vUv.y) * 1.2, 0.0, 1.0);
  float depth = clamp(radial * 0.7 + vertical * 0.5, 0.0, 1.0);

  // 对焦平面：焦距越长，对焦距离影响越大
  float focusPlane = clamp(1.0 - log(max(uFocusDist, 0.3)) / 8.0, 0.05, 0.85);
  float coc = depth - focusPlane;

  // 弥散圆半径：光圈越大越明显
  float amount = uAperture < 4.0 ? (4.0 - uAperture) / 4.0 : 0.0;
  float radius = abs(coc) * amount * 14.0 * (0.6 + uFocal * 0.4);

  if (radius < 0.5) {
    fragColor = src;
    return;
  }

  // 圆形 / 椭圆 / 多边形采样核
  vec2 offset = vec2(uTexel.x * radius, uTexel.y * radius);
  if (uBokehShape == 1) {
    offset.y *= 1.85; // 椭圆（变形宽银幕）
  }

  vec4 sum = vec4(0.0);
  float total = 0.0;
  const int TAPS = 12;

  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float angle = fi * 2.399963 + 0.5; // 黄金角采样
    vec2 dir = vec2(cos(angle), sin(angle));

    // 多边形焦外：把采样点投影到正多边形边界
    if (uBokehShape == 4) {
      float a = atan(dir.y, dir.x);
      float r = cos(3.14159 / 6.0) / cos(mod(a + 3.14159 / 6.0, 3.14159 / 3.0) - 3.14159 / 6.0);
      dir *= r;
    } else if (uBokehShape == 2) {
      // 猫眼：纵向压缩
      dir.y *= 0.65;
    } else if (uBokehShape == 3) {
      // 柠檬：横向压缩
      dir.x *= 0.7;
    }

    vec2 sampleUv = vUv + dir * offset * (0.4 + 0.6 * fract(fi * 0.618));
    vec4 s = texture(uTex, sampleUv);
    float w = 1.0;
    sum += s * w;
    total += w;
  }

  fragColor = sum / max(total, 0.0001);
}
`

/**
 * Pass 1 —— 主调色
 * 严格按真实管线顺序：曝光 → 白平衡 → Look → 对比度 → 色阶 → 滚降 → 暗部 → 饱和 → 分离色调
 */
export const FRAG_GRADE = `#version 300 es
${COMMON}
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uTexel;

uniform float uExposure;
uniform float uExposureBias;
uniform float uWbTemp;
uniform float uWbTint;

uniform float uContrast;
uniform float uBlacks;
uniform float uWhites;
uniform float uRolloff;
uniform float uShadowLift;
uniform float uSaturation;
uniform float uVibrance;

uniform int uLookId;
uniform float uLookMix;
uniform vec3 uSplitShadow;
uniform vec3 uSplitHighlight;
uniform float uSplitBalance;
uniform float uSplitAmount;

uniform float uSharpness;

// Look 参数数组
// 每种 Look 23 个 float：0=hueShift, 1=saturation, 2..4=hiTint, 5..7=shTint,
//                            8..12=R曲线5点, 13..17=G曲线5点, 18..22=B曲线5点
// 16 种 × 23 = 368
uniform float uLookParams[368];

// 由 5 个控制点插值 tone curve
float curveEval(float x, float p0, float p1, float p2, float p3, float p4) {
  if (x <= 0.0) return 0.0;
  if (x >= 1.0) return 1.0;
  float v;
  if (x < 0.25) v = mix(p0, p1, x / 0.25);
  else if (x < 0.5) v = mix(p1, p2, (x - 0.25) / 0.25);
  else if (x < 0.75) v = mix(p2, p3, (x - 0.5) / 0.25);
  else v = mix(p3, p4, (x - 0.75) / 0.25);
  return v;
}

vec3 applyLook(vec3 c) {
  int base = uLookId * 23;
  float r = curveEval(c.r,
    uLookParams[base + 8], uLookParams[base + 9], uLookParams[base + 10],
    uLookParams[base + 11], uLookParams[base + 12]);
  float g = curveEval(c.g,
    uLookParams[base + 13], uLookParams[base + 14], uLookParams[base + 15],
    uLookParams[base + 16], uLookParams[base + 17]);
  float b = curveEval(c.b,
    uLookParams[base + 18], uLookParams[base + 19], uLookParams[base + 20],
    uLookParams[base + 21], uLookParams[base + 22]);

  vec3 curved = vec3(r, g, b);
  float sat = uLookParams[base + 1];
  curved = mix(vec3(luma(curved)), curved, sat);

  // 高光/阴影偏色
  float l = luma(curved);
  vec3 hiTint = vec3(uLookParams[base + 2], uLookParams[base + 3], uLookParams[base + 4]);
  vec3 shTint = vec3(uLookParams[base + 5], uLookParams[base + 6], uLookParams[base + 7]);
  curved += hiTint * smoothstep(0.55, 1.0, l) + shTint * (1.0 - smoothstep(0.0, 0.45, l));

  return mix(c, curved, uLookMix);
}

void main() {
  vec3 c = texture(uTex, vUv).rgb;

  // 1. 曝光
  c *= pow(2.0, uExposure + uExposureBias);

  // 2. 白平衡：色温增益（简化版普朗克近似）
  // uWbTemp = 色温 / 6500，1.0 约等于 6500K。
  // 5600K（日常日光）应接近中性，因此以 5600K 为零点做相对偏移，
  // 否则默认 5600K 就会给画面加一层暖调。
  float tempRatio = uWbTemp * (6500.0 / 5600.0);
  vec3 wbGain = vec3(
    1.0 / (0.55 + 0.45 * tempRatio),  // 偏暖 → 提升红
    1.0,
    0.55 + 0.45 * tempRatio           // 偏暖 → 降低蓝
  );
  // 色调：绿 ↔ 品红
  wbGain.g *= 1.0 + uWbTint * 0.12;
  wbGain.r *= 1.0 - uWbTint * 0.10;
  wbGain.b *= 1.0 - uWbTint * 0.10;
  c *= wbGain;

  // 3. Look（tone curve + 偏色 + 饱和）
  c = applyLook(c);

  // 4. 对比度：绕 0.5 的 S 曲线
  c = clamp((c - 0.5) * (1.0 + uContrast * 0.8) + 0.5, 0.0, 4.0);

  // 5. 黑位 / 白位
  c = clamp((c - uBlacks * 0.25) / (1.0 + uWhites * 0.2), 0.0, 4.0);

  // 6. 高光滚降：向 1.0 压缩
  float l = luma(c);
  float hiMask = smoothstep(0.55, 1.0, l);
  vec3 compressed = c / (1.0 + max(c - 0.8, vec3(0.0)) * (1.0 + uRolloff * 2.0));
  c = mix(c, compressed, hiMask * uRolloff);

  // 7. 暗部提亮
  float loMask = 1.0 - smoothstep(0.0, 0.45, l);
  c += uShadowLift * 0.12 * loMask;

  // 8. 饱和度
  float l2 = luma(c);
  c = mix(vec3(l2), c, uSaturation);

  // 9. 自然饱和：保护已饱和与肤色
  vec3 hsv = rgb2hsv(clamp(c, 0.0, 1.0));
  // 中性灰（饱和度为 0）的色相是无意义的，
  // 若直接给饱和度加量，会按 hue=0（红）凭空造出颜色。
  // 因此只对已有彩度的像素施加自然饱和。
  if (hsv.y > 0.001) {
    // uVibrance 是围绕 1.0 的倍率（1 + tone.vibrance/100），
    // 真正要施加的增量是它与 1.0 的差值，而不是它本身。
    float vibAmount = uVibrance - 1.0;
    // 自然饱和用**乘法**而非加法：
    // 增量与现有彩度成正比、且对高饱和像素收敛，
    // 这样接近中性的像素不会被凭空染色。
    float boost = 1.0 + vibAmount * (1.0 - hsv.y);
    // 肤色保护：色相在 15°~55° 且饱和度中等
    float hueDeg = hsv.x * 360.0;
    bool skin = (hueDeg > 15.0 && hueDeg < 55.0) && hsv.y > 0.12 && hsv.y < 0.75;
    if (skin) boost = 1.0 + (boost - 1.0) * 0.35;
    hsv.y = clamp(hsv.y * boost, 0.0, 1.0);
    c = hsv2rgb(hsv);
  }

  // 10. 分离色调
  if (uSplitAmount > 0.001) {
    float l3 = luma(c);
    vec3 shadowMask = vec3(1.0 - smoothstep(0.0, 0.5, l3));
    vec3 highMask = vec3(smoothstep(0.5, 1.0, l3));
    float balance = uSplitBalance * 0.5 + 0.5;
    // 去均值：只保留 tint 的色度倾向，避免整体提亮或压暗
    vec3 shTint = uSplitShadow - vec3(luma(uSplitShadow));
    vec3 hiTint = uSplitHighlight - vec3(luma(uSplitHighlight));
    c += (shTint * shadowMask * (1.0 - balance) + hiTint * highMask * balance)
       * uSplitAmount * 0.9;
  }

  // 11. 锐化（unsharp mask）
  if (uSharpness > 0.001) {
    vec3 blur = vec3(0.0);
    blur += texture(uTex, vUv + vec2(uTexel.x, 0.0)).rgb;
    blur += texture(uTex, vUv - vec2(uTexel.x, 0.0)).rgb;
    blur += texture(uTex, vUv + vec2(0.0, uTexel.y)).rgb;
    blur += texture(uTex, vUv - vec2(0.0, uTexel.y)).rgb;
    blur *= 0.25;
    c += (c - blur) * uSharpness * 0.8;
  }

  fragColor = vec4(max(c, vec3(0.0)), 1.0);
}
`

/**
 * Pass 2 —— 高光提取 + 分离模糊（泛光源）
 */
export const FRAG_BRIGHT = `#version 300 es
${COMMON}
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform float uThreshold;

void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = luma(c);
  float k = max(0.0, l - uThreshold) / max(l, 0.0001);
  fragColor = vec4(c * k, 1.0);
}
`

export const FRAG_BLUR = `#version 300 es
${COMMON}
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uDirection;   // 归一化方向 × 步长

void main() {
  // 9 tap 高斯
  float weights[5] = float[](0.2270270270, 0.1945945946, 0.1216216216, 0.0540540541, 0.0162162162);
  vec3 sum = texture(uTex, vUv).rgb * weights[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = uDirection * float(i);
    sum += texture(uTex, vUv + off).rgb * weights[i];
    sum += texture(uTex, vUv - off).rgb * weights[i];
  }
  fragColor = vec4(sum, 1.0);
}
`

/**
 * Pass 3 —— 合成：泛光 + 光晕 + 色差 + 暗角 + 光斑
 */
export const FRAG_COMPOSITE = `#version 300 es
${COMMON}
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform sampler2D uBloom;
uniform sampler2D uHalation;
uniform vec2 uTexel;
uniform float uBloomAmt;
uniform float uHalationAmt;
uniform float uChroma;
uniform float uVignette;
uniform float uDirt;
uniform float uFilmBack;

void main() {
  vec2 centered = vUv - 0.5;
  float radius = length(centered);

  // 色差：边缘处 R 与 B 通道径向偏移
  vec3 c;
  if (uChroma > 0.001) {
    vec2 shift = centered * uChroma * 0.006 * radius;
    c.r = texture(uTex, vUv + shift).r;
    c.g = texture(uTex, vUv).g;
    c.b = texture(uTex, vUv - shift).b;
  } else {
    c = texture(uTex, vUv).rgb;
  }

  // 泛光（偏白）
  vec3 bloom = texture(uBloom, vUv).rgb;
  c += bloom * uBloomAmt * 0.8;

  // 光晕（红橙）
  vec3 halation = texture(uHalation, vUv).rgb;
  c += halation * uHalationAmt * vec3(1.0, 0.35, 0.15) * 1.4;

  // 暗角
  float vig = 1.0 - uVignette * smoothstep(0.28, 0.78, radius) * 0.85;
  // 胶片背板：额外的有机晕影
  vig -= uFilmBack * smoothstep(0.35, 0.8, radius) * 0.2;
  c *= clamp(vig, 0.0, 1.0);

  // 镜头光斑：程序化噪声遮罩 × 高光区域
  if (uDirt > 0.001) {
    float dirtNoise = hash21(floor(vUv * 90.0));
    float spots = smoothstep(0.72, 0.98, dirtNoise);
    float l = luma(c);
    c += spots * uDirt * 0.35 * smoothstep(0.4, 1.0, l) * vec3(1.0, 0.92, 0.8);
  }

  fragColor = vec4(max(c, vec3(0.0)), 1.0);
}
`

/**
 * Pass 4 —— 颗粒 + 最终输出
 */
export const FRAG_GRAIN = `#version 300 es
${COMMON}
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uResolution;
uniform float uGrain;
uniform float uGrainSize;
uniform int uGrainType;
uniform float uIso;

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = luma(c);

  if (uGrain > 0.001 && uGrainType > 0) {
    float scale = uGrainSize * 3.0;
    vec2 gp = vUv * uResolution / scale;

    if (uGrainType == 1) {
      // 胶片颗粒：低频噪声，中间调最强
      float n = noise2(gp) * 0.65 + noise2(gp * 0.45) * 0.35;
      float midMask = 1.0 - abs(l - 0.42) * 1.6;
      float amp = uGrain * 0.22 * clamp(midMask, 0.15, 1.0);
      // 高光区颗粒弱
      amp *= (1.0 - smoothstep(0.7, 1.0, l) * 0.75);
      c += (n - 0.5) * amp;
    } else {
      // 数码噪点：亮度相关，暗部更强，带轻微色度噪声
      float n = hash21(gp * 1.7);
      float shadowMask = 1.0 - smoothstep(0.0, 0.6, l);
      float amp = uGrain * 0.16 * (0.4 + shadowMask);
      c += (n - 0.5) * amp;
      // 独立通道噪声
      c += (hash21(gp * 3.1 + 11.0) - 0.5) * amp * 0.35;
    }
  }

  // 输出：整条管线在 sRGB 空间运算，直接输出即可
  // （源纹理为 8bit sRGB，中间不做 linear↔sRGB 转换，避免二次编码导致发灰）
  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`

/** 生成纹理的顶点着色器 */
export const VERT_TEXTURE = `#version 300 es
precision highp float;
in vec2 aPos;
in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`
