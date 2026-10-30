import type {
  ParamSchema,
  ParamGroup,
  GroupId,
  Segment,
  Token,
  Localized,
} from '@/types/param'
import { TOKENS } from './tokens'

/**
 * 全部参数定义 —— 单一事实来源
 * 与 docs/02-parameter-schema.md 严格对应，共 52 个参数
 */

/** 分组定义 */
export const PARAM_GROUPS: ParamGroup[] = [
  { id: 'camera', label: { cn: '摄影机 / 机身', en: 'Camera body' }, order: 1 },
  { id: 'lens', label: { cn: '镜头', en: 'Lens' }, order: 2 },
  { id: 'exposure', label: { cn: '曝光', en: 'Exposure' }, order: 3 },
  { id: 'tone', label: { cn: '影调', en: 'Tone' }, order: 4 },
  { id: 'look', label: { cn: '色彩风格', en: 'Look' }, order: 5 },
  { id: 'texture', label: { cn: '质感与光效', en: 'Texture & effects' }, order: 6 },
  { id: 'lighting', label: { cn: '布光与光质', en: 'Lighting' }, order: 7 },
  { id: 'language', label: { cn: '构图与镜头语言', en: 'Composition & camera language' }, order: 8 },
  { id: 'atmosphere', label: { cn: '时间与氛围', en: 'Time & atmosphere' }, order: 9 },
  { id: 'mood', label: { cn: '情绪标签', en: 'Mood' }, order: 10 },
]

/** 区间段辅助 */
function seg(from: number, to: number, ...tokens: Token[]): Segment {
  return { from, to, tokens }
}

const schema: ParamSchema = {
  // ══════════════════════════════════════════════
  // camera 摄影机 / 机身
  // ══════════════════════════════════════════════
  'camera.sensor': {
    key: 'camera.sensor',
    type: 'select',
    label: { cn: '传感器', en: 'Sensor' },
    group: 'camera',
    note: { cn: '影响颗粒尺度与景深基准', en: 'Affects grain scale and depth baseline' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.sensorScale', type: 'float', convert: 'sensorScale' },
    default: 'ff',
    options: [
      {
        value: 'ff',
        label: { cn: '全画幅', en: 'Full frame' },
        tokens: [TOKENS.sensorFullFrame],
        preset: { sensorScale: 1.0 },
      },
      {
        value: 'apsc',
        label: { cn: 'APS-C', en: 'APS-C' },
        tokens: [TOKENS.sensorApsc],
        preset: { sensorScale: 0.85 },
      },
      {
        value: 'm43',
        label: { cn: '微型系统', en: 'Micro four thirds' },
        tokens: [TOKENS.sensorM43],
        preset: { sensorScale: 0.7 },
      },
      {
        value: 's35',
        label: { cn: 'Super35 电影机', en: 'Super35 cinema' },
        tokens: [TOKENS.sensorS35],
        preset: { sensorScale: 0.8 },
      },
      {
        value: '65',
        label: { cn: '65mm 大画幅', en: '65mm large format' },
        tokens: [TOKENS.sensor65],
        preset: { sensorScale: 1.2 },
      },
    ],
  },
  'camera.aspect': {
    key: 'camera.aspect',
    type: 'select',
    label: { cn: '画幅', en: 'Aspect ratio' },
    group: 'camera',
    note: { cn: '影响预览裁切与 --ar 参数', en: 'Affects preview crop and --ar flag' },
    preview: true,
    promptWeight: 0.7,
    bind: { name: 'u.aspect', type: 'float', convert: 'aspect' },
    default: '16:9',
    options: [
      { value: '16:9', label: { cn: '16:9 横屏', en: '16:9' }, preset: { aspect: 1.7778 } },
      { value: '2.39:1', label: { cn: '2.39:1 宽银幕', en: '2.39:1 scope' }, preset: { aspect: 2.39 } },
      { value: '4:3', label: { cn: '4:3', en: '4:3' }, preset: { aspect: 1.3333 } },
      { value: '3:2', label: { cn: '3:2', en: '3:2' }, preset: { aspect: 1.5 } },
      { value: '1:1', label: { cn: '1:1 方形', en: '1:1 square' }, preset: { aspect: 1 } },
      { value: '9:16', label: { cn: '9:16 竖屏', en: '9:16 vertical' }, preset: { aspect: 0.5625 } },
    ],
  },
  'camera.filmBack': {
    key: 'camera.filmBack',
    type: 'toggle',
    label: { cn: '胶片背板', en: 'Film back' },
    group: 'camera',
    note: { cn: '开启后边缘带轻微有机晕影', en: 'Adds organic vignetting at edges' },
    preview: true,
    promptWeight: 0.3,
    default: false,
  },

  // ══════════════════════════════════════════════
  // lens 镜头
  // ══════════════════════════════════════════════
  'lens.focalLength': {
    key: 'lens.focalLength',
    type: 'range',
    label: { cn: '焦距', en: 'Focal length' },
    group: 'lens',
    note: { cn: '毫米数本身 AI 敏感度低，会转译为体感描述', en: 'Exact mm is low-fidelity; translated to descriptive form' },
    preview: true,
    promptWeight: 0.8,
    bind: { name: 'u.focal', type: 'float', convert: 'focal' },
    default: 35,
    min: 8,
    max: 300,
    step: 1,
    unit: 'mm',
    scale: 'log',
    ticks: [
      { at: 14, label: '14' },
      { at: 35, label: '35' },
      { at: 85, label: '85' },
      { at: 200, label: '200' },
    ],
    segments: [
      seg(8, 20, TOKENS.lensUltraWide),
      seg(20, 35, TOKENS.lensWide),
      seg(35, 50, TOKENS.lensStandard),
      seg(50, 85, TOKENS.lensTele),
      seg(85, 135, TOKENS.lensLong),
      seg(135, 300, TOKENS.lensExtremeTele),
    ],
  },
  'lens.aperture': {
    key: 'lens.aperture',
    type: 'range',
    label: { cn: '光圈', en: 'Aperture' },
    group: 'lens',
    note: { cn: '光圈越大景深越浅，焦外越明显', en: 'Wider aperture means shallower depth of field' },
    preview: true,
    promptWeight: 0.9,
    bind: { name: 'u.aperture', type: 'float', convert: 'identity' },
    default: 2.8,
    min: 0.7,
    max: 22,
    step: 0.1,
    unit: 'f',
    scale: 'log',
    ticks: [
      { at: 1.4, label: '1.4' },
      { at: 2, label: '2' },
      { at: 2.8, label: '2.8' },
      { at: 4, label: '4' },
      { at: 5.6, label: '5.6' },
      { at: 8, label: '8' },
      { at: 11, label: '11' },
      { at: 16, label: '16' },
    ],
    segments: [
      seg(0.7, 1.4, TOKENS.dofUltraShallow),
      seg(1.4, 2.8, TOKENS.dofShallow),
      seg(2.8, 5.6, TOKENS.dofModerate),
      seg(5.6, 22, TOKENS.dofDeep),
    ],
  },
  'lens.focusDistance': {
    key: 'lens.focusDistance',
    type: 'range',
    label: { cn: '对焦距离', en: 'Focus distance' },
    group: 'lens',
    note: { cn: '决定焦平面位置', en: 'Determines the focal plane position' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.focusDist', type: 'float', convert: 'identity' },
    default: 3,
    min: 0.3,
    max: 100,
    step: 0.1,
    unit: 'm',
    scale: 'log',
  },
  'lens.lensType': {
    key: 'lens.lensType',
    type: 'select',
    label: { cn: '镜头性格', en: 'Lens character' },
    group: 'lens',
    note: { cn: '决定焦外形态与炫光特性', en: 'Determines bokeh shape and flare character' },
    preview: true,
    promptWeight: 0.8,
    default: 'standard',
    options: [
      { value: 'ultraWide', label: { cn: '超广角', en: 'Ultra wide' }, tokens: [TOKENS.lensUltraWide] },
      { value: 'wide', label: { cn: '广角', en: 'Wide' }, tokens: [TOKENS.lensWide] },
      { value: 'standard', label: { cn: '标准', en: 'Standard' }, tokens: [TOKENS.lensStandard] },
      { value: 'tele', label: { cn: '中长焦', en: 'Telephoto' }, tokens: [TOKENS.lensTele] },
      { value: 'macro', label: { cn: '微距', en: 'Macro' }, tokens: [TOKENS.macroLens] },
      { value: 'tilt', label: { cn: '移轴', en: 'Tilt-shift' }, tokens: [TOKENS.tiltShift] },
      { value: 'anamorphic', label: { cn: '变形宽银幕', en: 'Anamorphic' }, tokens: [TOKENS.anamorphic] },
      { value: 'fisheye', label: { cn: '鱼眼', en: 'Fisheye' }, tokens: [TOKENS.fisheye] },
    ],
  },
  'lens.bokehShape': {
    key: 'lens.bokehShape',
    type: 'select',
    label: { cn: '焦外形态', en: 'Bokeh shape' },
    group: 'lens',
    note: { cn: '焦外光斑的轮廓形状', en: 'Contour shape of out-of-focus highlights' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.bokehShape', type: 'int', convert: 'bokehShape' },
    default: 'round',
    options: [
      { value: 'round', label: { cn: '圆形', en: 'Round' }, tokens: [TOKENS.bokehRound] },
      { value: 'oval', label: { cn: '椭圆', en: 'Oval' }, tokens: [TOKENS.bokehOval] },
      { value: 'catEye', label: { cn: '猫眼', en: 'Cat-eye' }, tokens: [TOKENS.bokehCatEye] },
      { value: 'lemon', label: { cn: '柠檬', en: 'Lemon' }, tokens: [TOKENS.bokehLemon] },
      { value: 'hexagon', label: { cn: '六边形', en: 'Hexagon' }, tokens: [TOKENS.bokehHex] },
    ],
  },
  'lens.vignette': {
    key: 'lens.vignette',
    type: 'range',
    label: { cn: '镜头暗角', en: 'Lens vignette' },
    group: 'lens',
    note: { cn: '镜头自身的暗角衰减', en: 'Optical falloff at frame edges' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.vignette', type: 'float', convert: 'unit01' },
    default: 25,
    min: 0,
    max: 100,
    step: 1,
  },

  // ══════════════════════════════════════════════
  // exposure 曝光
  // ══════════════════════════════════════════════
  'exposure.shutter': {
    key: 'exposure.shutter',
    type: 'range',
    label: { cn: '快门速度', en: 'Shutter speed' },
    group: 'exposure',
    note: { cn: '决定运动模糊的程度', en: 'Determines motion blur amount' },
    preview: true,
    promptWeight: 0.8,
    bind: { name: 'u.shutter', type: 'float', convert: 'identity' },
    default: 48,
    min: 2,
    max: 8000,
    step: 1,
    unit: 's',
    scale: 'log',
    ticks: [
      { at: 24, label: '1/24' },
      { at: 48, label: '1/48' },
      { at: 125, label: '1/125' },
      { at: 500, label: '1/500' },
      { at: 2000, label: '1/2000' },
    ],
    segments: [
      seg(2, 30, TOKENS.motionSmear),
      seg(30, 125, TOKENS.motionBlurNatural),
      seg(125, 1000, TOKENS.motionBlurSlight),
      seg(1000, 8000, TOKENS.motionFrozen),
    ],
  },
  'exposure.iso': {
    key: 'exposure.iso',
    type: 'range',
    label: { cn: 'ISO', en: 'ISO' },
    group: 'exposure',
    note: { cn: '越高颗粒越重，暗部越粗糙', en: 'Higher ISO means coarser grain and rougher shadows' },
    preview: true,
    promptWeight: 0.6,
    bind: { name: 'u.iso', type: 'float', convert: 'identity' },
    default: 800,
    min: 50,
    max: 102400,
    step: 1,
    unit: 'ISO',
    scale: 'log',
    ticks: [
      { at: 100, label: '100' },
      { at: 800, label: '800' },
      { at: 3200, label: '3200' },
      { at: 12800, label: '12800' },
    ],
    segments: [
      seg(50, 200, TOKENS.grainClean),
      seg(200, 1600, TOKENS.grainFine),
      seg(1600, 6400, TOKENS.grainHeavy),
      seg(6400, 102400, TOKENS.grainDigital, TOKENS.grainHeavy),
    ],
  },
  'exposure.ev': {
    key: 'exposure.ev',
    type: 'range',
    label: { cn: '曝光补偿', en: 'Exposure compensation' },
    group: 'exposure',
    note: { cn: '整体明暗偏移', en: 'Global brightness offset' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.exposure', type: 'float', convert: 'exposure' },
    default: 0,
    min: -3,
    max: 3,
    step: 0.1,
    unit: 'EV',
  },
  'exposure.wbTemp': {
    key: 'exposure.wbTemp',
    type: 'range',
    label: { cn: '白平衡', en: 'White balance' },
    group: 'exposure',
    note: { cn: '精确色温 AI 敏感度低，会转译为体感描述', en: 'Exact kelvin is low-fidelity; translated to descriptive form' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.wbTemp', type: 'float', convert: 'wbTemp' },
    default: 5600,
    min: 2000,
    max: 12000,
    step: 50,
    unit: 'K',
    scale: 'log',
    ticks: [
      { at: 2700, label: '2700K' },
      { at: 3200, label: '3200K' },
      { at: 5600, label: '5600K' },
      { at: 7500, label: '7500K' },
    ],
    segments: [
      seg(2000, 3200, TOKENS.colorWarm),
      seg(3200, 4500, TOKENS.colorSlightlyWarm),
      seg(4500, 6500, TOKENS.colorNeutral),
      seg(6500, 12000, TOKENS.colorCool),
    ],
  },
  'exposure.wbTint': {
    key: 'exposure.wbTint',
    type: 'range',
    label: { cn: '色调', en: 'Tint' },
    group: 'exposure',
    note: { cn: '绿 ↔ 品红方向偏移', en: 'Green ↔ magenta shift' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.wbTint', type: 'float', convert: 'wbTint' },
    default: 0,
    min: -50,
    max: 50,
    step: 1,
  },
  'exposure.nd': {
    key: 'exposure.nd',
    type: 'range',
    label: { cn: 'ND 减光', en: 'ND filter' },
    group: 'exposure',
    note: { cn: '减光镜档位，控制进光量', en: 'Neutral density stops, controls light intake' },
    preview: true,
    promptWeight: 0.2,
    bind: { name: 'u.nd', type: 'float', convert: 'identity' },
    default: 0,
    min: 0,
    max: 6,
    step: 0.5,
    unit: '档',
  },

  // ══════════════════════════════════════════════
  // tone 影调
  // ══════════════════════════════════════════════
  'tone.contrast': {
    key: 'tone.contrast',
    type: 'range',
    label: { cn: '反差', en: 'Contrast' },
    group: 'tone',
    note: { cn: '整体明暗对比强度', en: 'Overall tonal contrast' },
    preview: true,
    promptWeight: 0.6,
    bind: { name: 'u.contrast', type: 'float', convert: 'signed01' },
    default: 18,
    min: -100,
    max: 100,
    step: 1,
    segments: [
      seg(50, 100, TOKENS.toneHighContrast),
      seg(-100, -30, TOKENS.toneLowContrast),
    ],
  },
  'tone.blacks': {
    key: 'tone.blacks',
    type: 'range',
    label: { cn: '黑位', en: 'Blacks' },
    group: 'tone',
    note: { cn: '阴影端的黑场位置', en: 'Black point position in shadows' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.blacks', type: 'float', convert: 'signed01' },
    default: -12,
    min: -100,
    max: 100,
    step: 1,
    segments: [
      seg(-100, -30, TOKENS.toneDeepBlacks),
      seg(30, 100, TOKENS.toneMilky),
    ],
  },
  'tone.whites': {
    key: 'tone.whites',
    type: 'range',
    label: { cn: '白位', en: 'Whites' },
    group: 'tone',
    note: { cn: '高光端的白场位置', en: 'White point position in highlights' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.whites', type: 'float', convert: 'signed01' },
    default: 8,
    min: -100,
    max: 100,
    step: 1,
    segments: [seg(30, 100, TOKENS.toneCleanHighlights)],
  },
  'tone.highlightRolloff': {
    key: 'tone.highlightRolloff',
    type: 'range',
    label: { cn: '高光滚降', en: 'Highlight rolloff' },
    group: 'tone',
    note: { cn: '高光过渡的柔和程度', en: 'Softness of highlight transition' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.rolloff', type: 'float', convert: 'unit01' },
    default: 55,
    min: 0,
    max: 100,
    step: 1,
    segments: [seg(70, 100, TOKENS.toneSoftRolloff)],
  },
  'tone.shadowLift': {
    key: 'tone.shadowLift',
    type: 'range',
    label: { cn: '暗部提亮', en: 'Shadow lift' },
    group: 'tone',
    note: { cn: '阴影提亮程度，胶片感的来源之一', en: 'Shadow lift amount, a source of filmic feel' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.shadowLift', type: 'float', convert: 'unit01' },
    default: 22,
    min: 0,
    max: 100,
    step: 1,
    segments: [seg(60, 100, TOKENS.toneLiftedShadows)],
  },
  'tone.saturation': {
    key: 'tone.saturation',
    type: 'range',
    label: { cn: '饱和度', en: 'Saturation' },
    group: 'tone',
    note: { cn: '全局色彩强度', en: 'Global color intensity' },
    preview: true,
    promptWeight: 0.6,
    bind: { name: 'u.saturation', type: 'float', convert: 'plus1' },
    default: 8,
    min: -100,
    max: 100,
    step: 1,
    segments: [
      seg(-100, -40, TOKENS.toneDesaturated),
      seg(40, 100, TOKENS.toneSaturated),
    ],
  },
  'tone.vibrance': {
    key: 'tone.vibrance',
    type: 'range',
    label: { cn: '自然饱和', en: 'Vibrance' },
    group: 'tone',
    note: { cn: '保护肤色与已饱和区域', en: 'Protects skin tones and already-saturated areas' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.vibrance', type: 'float', convert: 'plus1' },
    default: 15,
    min: -100,
    max: 100,
    step: 1,
    segments: [seg(40, 100, TOKENS.toneVibrant)],
  },

  // ══════════════════════════════════════════════
  // look 色彩风格
  // ══════════════════════════════════════════════
  'look.style': {
    key: 'look.style',
    type: 'select',
    label: { cn: '风格 Look', en: 'Look' },
    group: 'look',
    note: { cn: '整体色彩基调，胶片或调色风格', en: 'Overall color character, film or grade' },
    preview: true,
    promptWeight: 1,
    bind: { name: 'u.lookId', type: 'int', convert: 'lookId' },
    default: 'neutral',
    options: [
      { value: 'neutral', label: { cn: '中性电影', en: 'Neutral cinematic' }, tokens: [TOKENS.lookNeutral] },
      { value: 'kodak250d', label: { cn: 'Kodak Vision3 250D', en: 'Kodak Vision3 250D' }, tokens: [TOKENS.lookKodak250d] },
      { value: 'kodak500t', label: { cn: 'Kodak Vision3 500T', en: 'Kodak Vision3 500T' }, tokens: [TOKENS.lookKodak500t] },
      { value: 'fujiEterna', label: { cn: 'Fuji Eterna', en: 'Fuji Eterna' }, tokens: [TOKENS.lookEterna] },
      { value: 'fujiProNeg', label: { cn: 'Fuji Pro Neg. Hi', en: 'Fuji Pro Neg Hi' }, tokens: [TOKENS.lookProNeg] },
      { value: 'alexaLogC', label: { cn: 'ARRI Alexa LogC', en: 'ARRI Alexa LogC' }, tokens: [TOKENS.lookAlexaLogC] },
      { value: 'redLog3g10', label: { cn: 'RED Log3G10', en: 'RED Log3G10' }, tokens: [TOKENS.lookRedLog] },
      { value: 'technicolor', label: { cn: 'Technicolor 三色彩', en: 'Technicolor three-strip' }, tokens: [TOKENS.lookTechnicolor] },
      { value: 'bleachBypass', label: { cn: '漂白效果', en: 'Bleach bypass' }, tokens: [TOKENS.lookBleachBypass] },
      { value: 'crossProcess', label: { cn: '交叉冲印', en: 'Cross process' }, tokens: [TOKENS.lookCrossProcess] },
      { value: 'bw', label: { cn: '银盐黑白', en: 'Silver gelatin B&W' }, tokens: [TOKENS.lookBw] },
      { value: 'sepia', label: { cn: '复古棕调', en: 'Sepia vintage' }, tokens: [TOKENS.lookSepia] },
      { value: 'tealOrange', label: { cn: '青橙大片感', en: 'Teal & orange blockbuster' }, tokens: [TOKENS.lookTealOrange] },
      { value: 'coldSteel', label: { cn: '冷钢调', en: 'Cold steel' }, tokens: [TOKENS.lookColdSteel] },
      { value: 'warmNoir', label: { cn: '暖调黑色电影', en: 'Warm film noir' }, tokens: [TOKENS.lookWarmNoir] },
      { value: 'cyberpunk', label: { cn: '赛博霓虹', en: 'Cyberpunk neon' }, tokens: [TOKENS.lookCyberpunk] },
    ],
  },
  'look.intensity': {
    key: 'look.intensity',
    type: 'range',
    label: { cn: '强度', en: 'Intensity' },
    group: 'look',
    note: { cn: 'Look 效果的混合比例', en: 'Blend ratio of the look effect' },
    preview: true,
    promptWeight: 0.3,
    bind: { name: 'u.lookMix', type: 'float', convert: 'unit01' },
    default: 70,
    min: 0,
    max: 100,
    step: 1,
  },
  'look.splitShadow': {
    key: 'look.splitShadow',
    type: 'color',
    label: { cn: '阴影色', en: 'Shadow tint' },
    group: 'look',
    note: { cn: '分离色调的阴影色', en: 'Split toning shadow color' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.splitShadow', type: 'vec3', convert: 'colorHex' },
    default: '#1a2a4a',
  },
  'look.splitHighlight': {
    key: 'look.splitHighlight',
    type: 'color',
    label: { cn: '高光色', en: 'Highlight tint' },
    group: 'look',
    note: { cn: '分离色调的高光色', en: 'Split toning highlight color' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.splitHighlight', type: 'vec3', convert: 'colorHex' },
    default: '#ffd9a8',
  },
  'look.splitBalance': {
    key: 'look.splitBalance',
    type: 'range',
    label: { cn: '分离平衡', en: 'Split balance' },
    group: 'look',
    note: { cn: '阴影色与高光色的比重', en: 'Balance between shadow and highlight tint' },
    preview: true,
    promptWeight: 0.2,
    bind: { name: 'u.splitBalance', type: 'float', convert: 'signed01' },
    default: 0,
    min: -100,
    max: 100,
    step: 1,
  },
  'look.splitAmount': {
    key: 'look.splitAmount',
    type: 'range',
    label: { cn: '分离强度', en: 'Split intensity' },
    group: 'look',
    note: { cn: '分离色调的整体强度，0 表示不启用', en: 'Overall split toning intensity, 0 disables it' },
    preview: true,
    promptWeight: 0.2,
    bind: { name: 'u.splitAmount', type: 'float', convert: 'unit01' },
    default: 35,
    min: 0,
    max: 100,
    step: 1,
  },

  // ══════════════════════════════════════════════
  // texture 质感与光效
  // ══════════════════════════════════════════════
  'texture.grain': {
    key: 'texture.grain',
    type: 'range',
    label: { cn: '颗粒强度', en: 'Grain intensity' },
    group: 'texture',
    note: { cn: '暗部颗粒更明显，高光更弱', en: 'Grain shows more in shadows, less in highlights' },
    preview: true,
    promptWeight: 0.7,
    bind: { name: 'u.grain', type: 'float', convert: 'unit01' },
    default: 28,
    min: 0,
    max: 100,
    step: 1,
    segments: [
      seg(60, 100, TOKENS.grainHeavy),
      seg(25, 60, TOKENS.grainFine),
      seg(0, 10, TOKENS.grainClean),
    ],
  },
  'texture.grainSize': {
    key: 'texture.grainSize',
    type: 'range',
    label: { cn: '颗粒尺寸', en: 'Grain size' },
    group: 'texture',
    note: { cn: '颗粒的粗细程度', en: 'Coarseness of the grain structure' },
    preview: true,
    promptWeight: 0.3,
    bind: { name: 'u.grainSize', type: 'float', convert: 'grainSize' },
    default: 40,
    min: 0,
    max: 100,
    step: 1,
  },
  'texture.grainType': {
    key: 'texture.grainType',
    type: 'select',
    label: { cn: '颗粒类型', en: 'Grain type' },
    group: 'texture',
    note: { cn: '胶片颗粒柔和，数码噪点更硬', en: 'Film grain is soft; digital noise is harsher' },
    preview: true,
    promptWeight: 0.4,
    bind: { name: 'u.grainType', type: 'int', convert: 'grainType' },
    default: 'film',
    options: [
      { value: 'film', label: { cn: '胶片颗粒', en: 'Film grain' }, tokens: [TOKENS.grainFine] },
      { value: 'digital', label: { cn: '数码噪点', en: 'Digital noise' }, tokens: [TOKENS.grainDigital] },
      { value: 'none', label: { cn: '无颗粒', en: 'None' }, tokens: [TOKENS.grainClean] },
    ],
  },
  'texture.bloom': {
    key: 'texture.bloom',
    type: 'range',
    label: { cn: '泛光', en: 'Bloom' },
    group: 'texture',
    note: { cn: '高光的柔和扩散', en: 'Soft diffusion of highlights' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.bloom', type: 'float', convert: 'unit01' },
    default: 18,
    min: 0,
    max: 100,
    step: 1,
    segments: [seg(50, 100, TOKENS.bloomSoft)],
  },
  'texture.halation': {
    key: 'texture.halation',
    type: 'range',
    label: { cn: '光晕', en: 'Halation' },
    group: 'texture',
    note: { cn: '高光周围的红色溢散，胶片特征', en: 'Red-orange glow around highlights, a film signature' },
    preview: true,
    promptWeight: 0.5,
    bind: { name: 'u.halation', type: 'float', convert: 'unit01' },
    default: 12,
    min: 0,
    max: 100,
    step: 1,
    segments: [seg(40, 100, TOKENS.halation)],
  },
  'texture.chroma': {
    key: 'texture.chroma',
    type: 'range',
    label: { cn: '色差', en: 'Chromatic aberration' },
    group: 'texture',
    note: { cn: '画面边缘的 RGB 分离', en: 'RGB separation at frame edges' },
    preview: true,
    promptWeight: 0.3,
    bind: { name: 'u.chroma', type: 'float', convert: 'unit01' },
    default: 8,
    min: 0,
    max: 100,
    step: 1,
    segments: [seg(50, 100, TOKENS.chromaAberration)],
  },
  'texture.sharpness': {
    key: 'texture.sharpness',
    type: 'range',
    label: { cn: '锐度', en: 'Sharpness' },
    group: 'texture',
    note: { cn: '未锐化掩模强度', en: 'Unsharp mask strength' },
    preview: true,
    promptWeight: 0.3,
    bind: { name: 'u.sharpness', type: 'float', convert: 'unit01' },
    default: 35,
    min: 0,
    max: 100,
    step: 1,
  },
  'texture.dirt': {
    key: 'texture.dirt',
    type: 'range',
    label: { cn: '镜头脏污', en: 'Lens dirt' },
    group: 'texture',
    note: { cn: '镜头表面污渍造成的光斑', en: 'Flare caused by lens surface grime' },
    preview: true,
    promptWeight: 0.2,
    bind: { name: 'u.dirt', type: 'float', convert: 'unit01' },
    default: 0,
    min: 0,
    max: 100,
    step: 1,
    segments: [seg(1, 100, TOKENS.lensDirt)],
  },

  // ══════════════════════════════════════════════
  // lighting 布光与光质
  // ══════════════════════════════════════════════
  'light.quality': {
    key: 'light.quality',
    type: 'select',
    label: { cn: '光质', en: 'Light quality' },
    group: 'lighting',
    note: { cn: '光源的软硬与色温倾向', en: 'Hardness and color tendency of the source' },
    preview: true,
    promptWeight: 0.8,
    bind: { name: 'u.softness', type: 'float', convert: 'enum' },
    default: 'soft',
    options: [
      { value: 'soft', label: { cn: '柔光', en: 'Soft' }, tokens: [TOKENS.lightSoft], preset: { softness: 0.9 } },
      { value: 'diffused', label: { cn: '漫射', en: 'Diffused' }, tokens: [TOKENS.lightOvercast], preset: { softness: 0.7 } },
      { value: 'hard', label: { cn: '硬光', en: 'Hard' }, tokens: [TOKENS.lightHard], preset: { softness: 0.05 } },
      { value: 'overcast', label: { cn: '阴天', en: 'Overcast' }, tokens: [TOKENS.lightOvercast], preset: { softness: 0.8 } },
      { value: 'candle', label: { cn: '烛光', en: 'Candle' }, tokens: [TOKENS.lightCandle], preset: { softness: 0.6 } },
      { value: 'neon', label: { cn: '霓虹', en: 'Neon' }, tokens: [TOKENS.lightNeon], preset: { softness: 0.4 } },
      { value: 'moonlight', label: { cn: '月光', en: 'Moonlight' }, tokens: [TOKENS.lightMoon], preset: { softness: 0.75 } },
      { value: 'street', label: { cn: '街灯', en: 'Street lamp' }, tokens: [TOKENS.lightPracticalStreet], preset: { softness: 0.5 } },
    ],
  },
  'light.direction': {
    key: 'light.direction',
    type: 'select',
    label: { cn: '光位', en: 'Light direction' },
    group: 'lighting',
    note: { cn: '主光相对被摄体的方位', en: 'Position of key light relative to subject' },
    preview: true,
    promptWeight: 0.8,
    default: 'back',
    options: [
      { value: 'front', label: { cn: '正面', en: 'Front' }, tokens: [TOKENS.lightFront] },
      { value: 'side', label: { cn: '侧光', en: 'Side' }, tokens: [TOKENS.lightSide] },
      { value: 'rim', label: { cn: '轮廓光', en: 'Rim' }, tokens: [TOKENS.lightRim] },
      { value: 'back', label: { cn: '逆光', en: 'Back' }, tokens: [TOKENS.lightBack] },
      { value: 'top', label: { cn: '顶光', en: 'Top' }, tokens: [TOKENS.lightTop] },
      { value: 'under', label: { cn: '底光', en: 'Under' }, tokens: [TOKENS.lightUnder] },
    ],
  },
  'light.ratio': {
    key: 'light.ratio',
    type: 'range',
    label: { cn: '光比', en: 'Key-to-fill ratio' },
    group: 'lighting',
    note: { cn: '主光与补光的强度比', en: 'Intensity ratio between key and fill' },
    preview: false,
    promptWeight: 0.5,
    default: 4,
    min: 1,
    max: 16,
    step: 0.5,
    unit: ':1',
    scale: 'log',
    segments: [seg(8, 16, TOKENS.lightRatioHigh)],
  },
  'light.fill': {
    key: 'light.fill',
    type: 'range',
    label: { cn: '补光', en: 'Fill light' },
    group: 'lighting',
    note: { cn: '补光强度占比', en: 'Fill light proportion' },
    preview: false,
    promptWeight: 0.3,
    default: 30,
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
  },
  'light.practical': {
    key: 'light.practical',
    type: 'select',
    label: { cn: '实用光源', en: 'Practical light' },
    group: 'lighting',
    note: { cn: '画面中真实存在的光源', en: 'Light sources physically present in frame' },
    preview: false,
    promptWeight: 0.6,
    default: 'none',
    options: [
      { value: 'none', label: { cn: '无', en: 'None' } },
      { value: 'neon', label: { cn: '霓虹招牌', en: 'Neon signage' }, tokens: [TOKENS.lightPracticalNeon] },
      { value: 'practical', label: { cn: '室内实用光', en: 'Interior practical' }, tokens: [TOKENS.lightPracticalWindow] },
      { value: 'street', label: { cn: '街灯', en: 'Street lamp' }, tokens: [TOKENS.lightPracticalStreet] },
      { value: 'window', label: { cn: '窗光', en: 'Window light' }, tokens: [TOKENS.lightPracticalWindow] },
      { value: 'campfire', label: { cn: '篝火', en: 'Campfire' }, tokens: [TOKENS.lightPracticalFire] },
    ],
  },
  'light.mood': {
    key: 'light.mood',
    type: 'select',
    label: { cn: '曝光倾向', en: 'Exposure tendency' },
    group: 'lighting',
    note: { cn: '整体明暗基调', en: 'Overall tonal tendency' },
    preview: true,
    promptWeight: 0.6,
    bind: { name: 'u.exposureBias', type: 'float', convert: 'enum' },
    default: 'balanced',
    options: [
      { value: 'under', label: { cn: '欠曝', en: 'Under' }, tokens: [TOKENS.exposureUnder], preset: { exposureBias: -0.4 } },
      { value: 'balanced', label: { cn: '均衡', en: 'Balanced' }, tokens: [TOKENS.exposureBalanced], preset: { exposureBias: 0 } },
      { value: 'over', label: { cn: '过曝', en: 'Over' }, tokens: [TOKENS.exposureOver], preset: { exposureBias: 0.35 } },
    ],
  },

  // ══════════════════════════════════════════════
  // language 构图与镜头语言
  // ══════════════════════════════════════════════
  'language.shotSize': {
    key: 'language.shotSize',
    type: 'select',
    label: { cn: '景别', en: 'Shot size' },
    group: 'language',
    note: { cn: '主体的取景范围', en: 'Framing range of the subject' },
    preview: false,
    promptWeight: 1,
    default: 'medium',
    options: [
      { value: 'macro', label: { cn: '微距', en: 'Macro' }, tokens: [TOKENS.shotMacro] },
      { value: 'close', label: { cn: '特写', en: 'Close-up' }, tokens: [TOKENS.shotClose] },
      { value: 'mediumClose', label: { cn: '近景', en: 'Medium close-up' }, tokens: [TOKENS.shotMediumClose] },
      { value: 'medium', label: { cn: '中景', en: 'Medium shot' }, tokens: [TOKENS.shotMedium] },
      { value: 'full', label: { cn: '全景', en: 'Full shot' }, tokens: [TOKENS.shotFull] },
      { value: 'wide', label: { cn: '大远景', en: 'Wide' }, tokens: [TOKENS.shotWide] },
      { value: 'extremeWide', label: { cn: '极远景', en: 'Extreme wide' }, tokens: [TOKENS.shotExtremeWide] },
    ],
  },
  'language.angle': {
    key: 'language.angle',
    type: 'select',
    label: { cn: '机位', en: 'Camera angle' },
    group: 'language',
    note: { cn: '摄影机的垂直与倾斜角度', en: 'Vertical and tilt angle of the camera' },
    preview: false,
    promptWeight: 0.7,
    default: 'eye',
    options: [
      { value: 'eye', label: { cn: '平视', en: 'Eye level' } },
      { value: 'high', label: { cn: '俯拍', en: 'High angle' } },
      { value: 'low', label: { cn: '仰拍', en: 'Low angle' } },
      { value: 'top', label: { cn: '顶视', en: 'Top-down' } },
      { value: 'dutch', label: { cn: '荷兰角', en: 'Dutch angle' } },
      { value: 'overShoulder', label: { cn: '过肩', en: 'Over the shoulder' } },
    ],
  },
  'language.movement': {
    key: 'language.movement',
    type: 'select',
    label: { cn: '运镜', en: 'Camera movement' },
    group: 'language',
    note: { cn: '摄影机的运动方式', en: 'How the camera moves' },
    preview: false,
    promptWeight: 1,
    default: 'static',
    options: [
      { value: 'static', label: { cn: '固定', en: 'Static' }, tokens: [TOKENS.moveStatic] },
      { value: 'handheld', label: { cn: '手持', en: 'Handheld' }, tokens: [TOKENS.moveHandheld] },
      { value: 'dollyIn', label: { cn: '推近', en: 'Dolly in' }, tokens: [TOKENS.moveDollyIn] },
      { value: 'dollyOut', label: { cn: '拉远', en: 'Dolly out' }, tokens: [TOKENS.moveDollyOut] },
      { value: 'pan', label: { cn: '横摇', en: 'Pan' }, tokens: [TOKENS.movePan] },
      { value: 'truck', label: { cn: '平移', en: 'Truck' }, tokens: [TOKENS.moveTruck] },
      { value: 'crane', label: { cn: '升降', en: 'Crane' }, tokens: [TOKENS.moveCrane] },
      { value: 'orbit', label: { cn: '环绕', en: 'Orbit' }, tokens: [TOKENS.moveOrbit] },
      { value: 'tracking', label: { cn: '跟随', en: 'Tracking' }, tokens: [TOKENS.moveTracking] },
      { value: 'aerial', label: { cn: '航拍', en: 'Aerial' }, tokens: [TOKENS.moveAerial] },
    ],
  },
  'language.movementIntensity': {
    key: 'language.movementIntensity',
    type: 'range',
    label: { cn: '运镜幅度', en: 'Movement intensity' },
    group: 'language',
    note: { cn: '运动的速度与幅度', en: 'Speed and amplitude of the movement' },
    preview: false,
    promptWeight: 0.3,
    default: 30,
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
  },
  'language.composition': {
    key: 'language.composition',
    type: 'select',
    label: { cn: '构图法', en: 'Composition' },
    group: 'language',
    note: { cn: '画面的空间组织方式', en: 'How space is organized in frame' },
    preview: false,
    promptWeight: 0.6,
    default: 'thirds',
    options: [
      { value: 'thirds', label: { cn: '三分', en: 'Rule of thirds' }, tokens: [TOKENS.compThirds] },
      { value: 'centered', label: { cn: '中心', en: 'Centered' }, tokens: [TOKENS.compCentered] },
      { value: 'symmetrical', label: { cn: '对称', en: 'Symmetrical' }, tokens: [TOKENS.compSymmetrical] },
      { value: 'framed', label: { cn: '框景', en: 'Framed' }, tokens: [TOKENS.compFramed] },
      { value: 'leading', label: { cn: '引导线', en: 'Leading lines' }, tokens: [TOKENS.compLeading] },
      { value: 'negativeSpace', label: { cn: '留白', en: 'Negative space' }, tokens: [TOKENS.compNegativeSpace] },
      { value: 'foreground', label: { cn: '前景遮挡', en: 'Foreground framing' }, tokens: [TOKENS.compForeground] },
    ],
  },
  'language.fov': {
    key: 'language.fov',
    type: 'select',
    label: { cn: '视野宽度', en: 'Field of view' },
    group: 'language',
    note: { cn: '画面的视野范围', en: 'Extent of the visible field' },
    preview: false,
    promptWeight: 0.5,
    default: 'medium',
    options: [
      { value: 'ultraWide', label: { cn: '超广', en: 'Ultra wide' }, tokens: [TOKENS.lensUltraWide] },
      { value: 'wide', label: { cn: '广角', en: 'Wide' }, tokens: [TOKENS.lensWide] },
      { value: 'normal', label: { cn: '标准', en: 'Normal' }, tokens: [TOKENS.lensStandard] },
      { value: 'tight', label: { cn: '紧凑', en: 'Tight' }, tokens: [TOKENS.lensTele] },
    ],
  },

  // ══════════════════════════════════════════════
  // atmosphere 时间与氛围
  // ══════════════════════════════════════════════
  'atmosphere.timeOfDay': {
    key: 'atmosphere.timeOfDay',
    type: 'select',
    label: { cn: '时段', en: 'Time of day' },
    group: 'atmosphere',
    note: { cn: '决定整体光线氛围', en: 'Determines the ambient light character' },
    preview: false,
    promptWeight: 0.9,
    default: 'goldenHour',
    options: [
      { value: 'dawn', label: { cn: '黎明', en: 'Dawn' }, tokens: [TOKENS.timeDawn] },
      { value: 'morning', label: { cn: '清晨', en: 'Morning' }, tokens: [TOKENS.timeMorning] },
      { value: 'noon', label: { cn: '正午', en: 'Noon' }, tokens: [TOKENS.timeNoon] },
      { value: 'afternoon', label: { cn: '午后', en: 'Afternoon' }, tokens: [TOKENS.timeAfternoon] },
      { value: 'goldenHour', label: { cn: '黄金时刻', en: 'Golden hour' }, tokens: [TOKENS.timeGolden] },
      { value: 'blueHour', label: { cn: '蓝调时刻', en: 'Blue hour' }, tokens: [TOKENS.timeBlue] },
      { value: 'dusk', label: { cn: '黄昏', en: 'Dusk' }, tokens: [TOKENS.timeDusk] },
      { value: 'night', label: { cn: '夜晚', en: 'Night' }, tokens: [TOKENS.timeNight] },
      { value: 'lateNight', label: { cn: '深夜', en: 'Late night' }, tokens: [TOKENS.timeLateNight] },
    ],
  },
  'atmosphere.weather': {
    key: 'atmosphere.weather',
    type: 'select',
    label: { cn: '天气', en: 'Weather' },
    group: 'atmosphere',
    note: { cn: '天气状况与画面质感', en: 'Weather condition and surface quality' },
    preview: false,
    promptWeight: 0.6,
    default: 'clear',
    options: [
      { value: 'clear', label: { cn: '晴朗', en: 'Clear' }, tokens: [TOKENS.weatherClear] },
      { value: 'cloudy', label: { cn: '多云', en: 'Cloudy' }, tokens: [TOKENS.weatherCloudy] },
      { value: 'overcast', label: { cn: '阴天', en: 'Overcast' }, tokens: [TOKENS.weatherOvercast] },
      { value: 'rain', label: { cn: '雨天', en: 'Rain' }, tokens: [TOKENS.weatherRain] },
      { value: 'snow', label: { cn: '雪天', en: 'Snow' }, tokens: [TOKENS.weatherSnow] },
      { value: 'fog', label: { cn: '雾天', en: 'Fog' }, tokens: [TOKENS.weatherFog] },
      { value: 'dust', label: { cn: '沙尘', en: 'Dust' }, tokens: [TOKENS.weatherDust] },
    ],
  },
  'atmosphere.haze': {
    key: 'atmosphere.haze',
    type: 'select',
    label: { cn: '空气介质', en: 'Atmosphere' },
    group: 'atmosphere',
    note: { cn: '空气中的悬浮介质', en: 'Particulate suspended in the air' },
    preview: false,
    promptWeight: 0.6,
    default: 'none',
    options: [
      { value: 'none', label: { cn: '通透', en: 'Clear' }, tokens: [TOKENS.hazeNone] },
      { value: 'thinMist', label: { cn: '薄雾', en: 'Thin mist' }, tokens: [TOKENS.hazeMist] },
      { value: 'denseFog', label: { cn: '浓雾', en: 'Dense fog' }, tokens: [TOKENS.hazeFog] },
      { value: 'smoke', label: { cn: '烟雾', en: 'Smoke' }, tokens: [TOKENS.hazeSmoke] },
      { value: 'steam', label: { cn: '蒸汽', en: 'Steam' }, tokens: [TOKENS.hazeSteam] },
      { value: 'dustMotes', label: { cn: '尘埃', en: 'Dust motes' }, tokens: [TOKENS.hazeDustMotes] },
      { value: 'rainStreaks', label: { cn: '雨丝', en: 'Rain streaks' }, tokens: [TOKENS.hazeRainStreaks] },
      { value: 'godRays', label: { cn: '体积光', en: 'God rays' }, tokens: [TOKENS.hazeGodRays] },
    ],
  },
  'atmosphere.season': {
    key: 'atmosphere.season',
    type: 'select',
    label: { cn: '季节', en: 'Season' },
    group: 'atmosphere',
    note: { cn: '季节带来的色调与环境', en: 'Seasonal palette and environment' },
    preview: false,
    promptWeight: 0.4,
    default: 'none',
    options: [
      { value: 'none', label: { cn: '无', en: 'None' } },
      { value: 'spring', label: { cn: '春', en: 'Spring' }, tokens: [TOKENS.seasonSpring] },
      { value: 'summer', label: { cn: '夏', en: 'Summer' }, tokens: [TOKENS.seasonSummer] },
      { value: 'autumn', label: { cn: '秋', en: 'Autumn' }, tokens: [TOKENS.seasonAutumn] },
      { value: 'winter', label: { cn: '冬', en: 'Winter' }, tokens: [TOKENS.seasonWinter] },
    ],
  },

  // ══════════════════════════════════════════════
  // mood 情绪标签
  // ══════════════════════════════════════════════
  'mood.tags': {
    key: 'mood.tags',
    type: 'tags',
    label: { cn: '情绪标签', en: 'Mood tags' },
    group: 'mood',
    note: { cn: '整体情绪倾向，可多选', en: 'Overall emotional tendency, multi-select' },
    preview: false,
    promptWeight: 0.5,
    default: ['cinematic'],
    options: [
      { value: 'cinematic', label: { cn: '电影感', en: 'Cinematic' }, tokens: [TOKENS.moodCinematic] },
      { value: 'warm', label: { cn: '温暖治愈', en: 'Warm' }, tokens: [TOKENS.moodWarm] },
      { value: 'cold', label: { cn: '冷峻疏离', en: 'Cold' }, tokens: [TOKENS.moodCold] },
      { value: 'nostalgic', label: { cn: '怀旧', en: 'Nostalgic' }, tokens: [TOKENS.moodNostalgic] },
      { value: 'documentary', label: { cn: '纪实粗粝', en: 'Documentary' }, tokens: [TOKENS.moodDocumentary] },
      { value: 'dreamy', label: { cn: '梦幻', en: 'Dreamy' }, tokens: [TOKENS.moodDreamy] },
      { value: 'noir', label: { cn: '黑色电影', en: 'Noir' }, tokens: [TOKENS.moodNoir] },
      { value: 'luxury', label: { cn: '奢华商业', en: 'Luxury' }, tokens: [TOKENS.moodLuxury] },
      { value: 'cyberpunk', label: { cn: '赛博朋克', en: 'Cyberpunk' }, tokens: [TOKENS.moodCyberpunk] },
      { value: 'minimal', label: { cn: '极简', en: 'Minimal' }, tokens: [TOKENS.moodMinimal] },
      { value: 'tense', label: { cn: '压抑紧张', en: 'Tense' }, tokens: [TOKENS.moodTense] },
      { value: 'romantic', label: { cn: '浪漫', en: 'Romantic' }, tokens: [TOKENS.moodRomantic] },
    ],
  },
}

/** 导出只读 schema */
export const PARAM_SCHEMA: Readonly<ParamSchema> = Object.freeze(schema)

/** 参数键列表（顺序与定义一致） */
export const PARAM_KEYS = Object.keys(PARAM_SCHEMA)

/** 按分组归类 */
export function paramsByGroup(): Record<GroupId, string[]> {
  const out = {} as Record<GroupId, string[]>
  for (const g of PARAM_GROUPS) out[g.id] = []
  for (const key of PARAM_KEYS) out[PARAM_SCHEMA[key].group].push(key)
  return out
}

/** 参数默认值集合 */
export function defaultValues(): Record<string, number | string | boolean | string[]> {
  const out: Record<string, number | string | boolean | string[]> = {}
  for (const key of PARAM_KEYS) {
    const p = PARAM_SCHEMA[key]
    if (p.type === 'tags') out[key] = [...p.default]
    else out[key] = p.default
  }
  return out
}

/** 显示格式化：把数值转成带单位的可读文本 */
export function formatValue(key: string, value: unknown): string {
  const p = PARAM_SCHEMA[key]
  if (!p) return String(value)

  if (p.type === 'range') {
    const v = Number(value)
    switch (key) {
      case 'lens.aperture':
        return `f/${v < 10 ? v.toFixed(1) : Math.round(v)}`
      case 'exposure.shutter':
        return v >= 1 ? `${v.toFixed(1)}"` : `1/${Math.round(v)} s`
      case 'exposure.iso':
        return String(Math.round(v))
      case 'exposure.wbTemp':
        return `${Math.round(v)} K`
      case 'exposure.ev':
        return `${v > 0 ? '+' : ''}${v.toFixed(1)} EV`
      case 'light.ratio':
        return `${v.toFixed(1)}:1`
      case 'tone.contrast':
      case 'tone.blacks':
      case 'tone.whites':
      case 'tone.saturation':
      case 'tone.vibrance':
      case 'look.splitBalance':
        return `${v > 0 ? '+' : ''}${Math.round(v)}`
      case 'lens.focusDistance':
        return v >= 100 ? '∞' : `${v.toFixed(1)} m`
      default:
        return p.unit === '%' ? `${Math.round(v)}%` : `${Math.round(v)}`
    }
  }

  if (p.type === 'select') {
    const opt = p.options.find((o) => o.value === value)
    return opt ? opt.label.cn : String(value)
  }

  if (p.type === 'toggle') return value ? '开' : '关'

  if (p.type === 'color') return String(value).toUpperCase()

  if (p.type === 'tags') {
    const arr = value as string[]
    if (arr.length === 0) return '未选择'
    return arr
      .map((v) => p.options.find((o) => o.value === v)?.label.cn ?? v)
      .join('、')
  }

  return String(value)
}

/** 分组摘要文本（折叠时显示在标题右侧） */
export function groupSummary(groupId: GroupId, values: Record<string, unknown>): string {
  const keys = paramsByGroup()[groupId]
  const parts: string[] = []
  for (const key of keys) {
    const p = PARAM_SCHEMA[key]
    if (p.type === 'select') {
      const opt = p.options.find((o) => o.value === values[key])
      if (opt && opt.value !== p.default) parts.push(opt.label.cn)
    } else if (p.type === 'range') {
      const v = Number(values[key])
      if (v !== p.default) parts.push(formatValue(key, v))
    }
  }
  return parts.slice(0, 3).join(' · ') || '默认'
}

/** 判断参数是否为低保真度（AI 模型难以精确执行） */
export function isLowFidelity(key: string): boolean {
  return key === 'exposure.wbTemp' || key === 'exposure.wbTint' || key === 'lens.focalLength'
}

/** 判断参数是否需要显示「≈」角标 */
export function needsApproxMark(key: string): boolean {
  return isLowFidelity(key)
}

export { seg }
export type { Localized }
