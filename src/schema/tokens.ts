import type { Token, TokenCategory } from '@/types/param'

/**
 * 语义 token 词库
 * 参数与提示词之间的中间表示层：参数 → Token → 平台渲染器
 */

/** 便捷构造：中文 + 英文 + 分类 + 强度 */
export function t(
  cn: string,
  en: string,
  category: TokenCategory,
  strength = 1,
): Token {
  return { cn, en, category, strength }
}

/** 便捷构造：双语一致的 token（如专有名词） */
export function tn(en: string, category: TokenCategory, strength = 1): Token {
  return { cn: en, en, category, strength }
}

export const TOKENS = {
  // ── 景别 / 主体 ──
  shotMacro: t('微距特写', 'extreme macro close-up', 'shot'),
  shotClose: t('特写', 'close-up shot', 'shot'),
  shotMediumClose: t('近景', 'medium close-up', 'shot'),
  shotMedium: t('中景', 'medium shot', 'shot'),
  shotFull: t('全景', 'full shot', 'shot'),
  shotWide: t('大远景', 'wide establishing shot', 'shot'),
  shotExtremeWide: t('极远景', 'extreme wide shot, vast scale', 'shot'),

  // ── 构图 ──
  compThirds: t('三分构图', 'rule of thirds composition', 'composition', 0.5),
  compCentered: t('中心构图', 'centered composition', 'composition', 0.5),
  compSymmetrical: t('对称构图', 'symmetrical centered composition', 'composition'),
  compFramed: t('框景构图', 'framed composition, subject framed within', 'composition', 0.5),
  compLeading: t('引导线构图', 'leading lines composition', 'composition'),
  compNegativeSpace: t('留白构图', 'negative space composition, minimal framing', 'composition', 0.5),
  compForeground: t('前景遮挡构图', 'foreground framing, layered depth', 'composition', 0.5),

  // ── 镜头 ──
  lensUltraWide: t('超广角', 'ultra wide lens, exaggerated perspective', 'lens'),
  lensWide: t('广角', 'wide lens, natural perspective', 'lens'),
  lensStandard: t('标准镜头', 'standard lens, natural perspective', 'lens'),
  lensTele: t('中长焦', 'telephoto compression', 'lens'),
  lensLong: t('长焦', 'long lens compression, flattened background', 'lens'),
  lensExtremeTele: t('超长焦', 'extreme telephoto, subject isolation', 'lens'),
  dofUltraShallow: t('极浅景深', 'ultra shallow depth of field, creamy bokeh', 'lens'),
  dofShallow: t('浅景深', 'shallow depth of field, soft background', 'lens'),
  dofModerate: t('中等景深', 'moderate depth of field', 'lens', 0.6),
  dofDeep: t('大景深', 'deep focus, everything sharp', 'lens'),
  bokehRound: t('圆形焦外', 'round bokeh', 'lens', 0.5),
  bokehOval: t('椭圆焦外', 'oval bokeh', 'lens'),
  bokehCatEye: t('猫眼焦外', 'cat-eye bokeh', 'lens', 0.5),
  bokehLemon: t('柠檬焦外', 'lemon-shaped bokeh', 'lens', 0.4),
  bokehHex: t('六边形焦外', 'hexagonal bokeh', 'lens', 0.4),
  anamorphic: t('变形宽银幕', 'anamorphic, oval bokeh, horizontal flares', 'lens'),
  tiltShift: t('移轴镜头', 'tilt-shift, distorted perspective', 'lens'),
  macroLens: t('微距镜头', 'macro lens, extreme shallow focus', 'lens'),
  fisheye: t('鱼眼镜头', 'fisheye lens, barrel distortion', 'lens'),

  // ── 运动 ──
  motionFrozen: t('瞬间凝固', 'frozen motion, crisp freeze frame', 'motion'),
  motionBlurSlight: t('轻微运动模糊', 'subtle motion blur', 'motion'),
  motionBlurNatural: t('电影级自然运动模糊', 'natural cinematic motion blur', 'motion'),
  motionSmear: t('动态拖影', 'motion smear, dynamic blur', 'motion'),
  moveStatic: t('固定机位', 'static locked-off camera', 'motion'),
  moveHandheld: t('手持晃动', 'handheld camera, slight organic shake', 'motion'),
  moveDollyIn: t('缓慢推近', 'slow dolly in, push in', 'motion'),
  moveDollyOut: t('缓慢拉远', 'slow dolly out, pull back', 'motion'),
  movePan: t('横摇', 'smooth pan across', 'motion'),
  moveTruck: t('横向平移', 'lateral tracking movement', 'motion'),
  moveCrane: t('升降摇臂', 'crane shot, rising movement', 'motion'),
  moveOrbit: t('环绕运镜', 'orbiting camera arc around subject', 'motion'),
  moveTracking: t('跟随拍摄', 'tracking shot following subject', 'motion'),
  moveAerial: t('航拍', 'aerial drone shot', 'motion'),

  // ── 光线 ──
  lightSoft: t('柔光', 'soft diffused lighting, gentle shadow transitions', 'light'),
  lightHard: t('硬光', 'hard directional light, defined shadows', 'light'),
  lightOvercast: t('阴天漫射光', 'overcast diffused daylight, flat soft light', 'light'),
  lightCandle: t('烛光', 'warm flickering candlelight', 'light'),
  lightNeon: t('霓虹光', 'colored neon lighting', 'light'),
  lightMoon: t('冷月光', 'cool moonlight, blue-silver night light', 'light'),
  lightFront: t('正面光', 'front lighting, flat even illumination', 'light', 0.5),
  lightSide: t('侧光', 'side lighting, chiaroscuro', 'light'),
  lightRim: t('逆光轮廓', 'rim lighting, backlit edge separation', 'light'),
  lightBack: t('逆光', 'backlit, glowing halo around subject', 'light'),
  lightTop: t('顶光', 'top lighting', 'light', 0.5),
  lightUnder: t('底光', 'underlighting, ominous uplight', 'light'),
  lightPracticalNeon: t('霓虹招牌实景光', 'neon signage practical lights', 'light'),
  lightPracticalStreet: t('街灯实景光', 'street lamp practical lights', 'light'),
  lightPracticalWindow: t('窗光', 'window light', 'light', 0.5),
  lightPracticalFire: t('篝火', 'campfire glow', 'light', 0.5),
  lightRatioHigh: t('高反差硬光', 'dramatic high key-to-fill ratio', 'light', 0.4),
  exposureUnder: t('欠曝暗调', 'underexposed, low-key lighting', 'light'),
  exposureBalanced: t('曝光均衡', 'balanced exposure', 'light', 0.3),
  exposureOver: t('过曝高调', 'overexposed, high-key bright', 'light'),

  // ── 色彩 ──
  colorWarm: t('暖调', 'warm tones', 'color'),
  colorSlightlyWarm: t('略暖', 'slightly warm tones', 'color', 0.6),
  colorNeutral: t('中性白平衡', 'neutral white balance', 'color', 0.5),
  colorCool: t('冷调', 'cool blue tones', 'color'),
  colorMagentaTint: t('偏品红', 'magenta tint', 'color', 0.4),
  colorGreenTint: t('偏绿', 'green tint', 'color', 0.4),
  lookNeutral: t('中性电影色', 'cinematic natural color, true to life', 'color'),
  lookKodak250d: t('柯达 250D 日光', 'Kodak Vision3 250D film look, warm daylight tones', 'color'),
  lookKodak500t: t('柯达 500T 钨丝', 'Kodak Vision3 500T tungsten film, warm nocturnal tones', 'color'),
  lookEterna: t('富士 Eterna', 'Fuji Eterna cinematic look, cool muted palette', 'color'),
  lookProNeg: t('富士 Pro Neg', 'Fuji Pro Neg Hi, soft pastel tones', 'color'),
  lookAlexaLogC: t('Alexa LogC', 'ARRI Alexa LogC color science, flat log profile', 'color'),
  lookRedLog: t('RED Log3G10', 'RED Log3G10 profile, sharp digital contrast', 'color'),
  lookTechnicolor: t('Technicolor 三色彩', 'Technicolor three-strip, saturated primaries', 'color'),
  lookBleachBypass: t('漂白效果', 'bleach bypass, silver retained high contrast', 'color'),
  lookCrossProcess: t('交叉冲印', 'cross processed, unconventional color shift', 'color'),
  lookBw: t('银盐黑白', 'black and white, silver gelatin, high monochrome contrast', 'color'),
  lookSepia: t('复古棕调', 'sepia toned vintage photograph', 'color'),
  lookTealOrange: t('青橙大片感', 'teal and orange blockbuster grade', 'color'),
  lookColdSteel: t('冷钢调', 'cold steel blue grade, clinical cool tones', 'color'),
  lookWarmNoir: t('暖调黑色电影', 'warm film noir, amber shadows', 'color'),
  lookCyberpunk: t('赛博霓虹', 'cyberpunk neon, magenta and cyan color palette', 'color'),
  splitToneShadow: t('冷色阴影', 'cool-toned shadows', 'tone', 0.4),
  splitToneHighlight: t('暖色高光', 'warm-toned highlights', 'tone', 0.4),

  // ── 影调 ──
  toneHighContrast: t('高反差', 'high contrast, punchy', 'tone'),
  toneLowContrast: t('低反差柔和', 'low contrast, flat soft tonality', 'tone'),
  toneDeepBlacks: t('扎实黑位', 'deep crushed blacks', 'tone'),
  toneMilky: t('灰雾黑位', 'milky lifted blacks, faded', 'tone'),
  toneCleanHighlights: t('干净高光', 'clean bright highlights', 'tone', 0.4),
  toneSoftRolloff: t('柔化高光滚降', 'soft highlight rolloff, gentle bloom in highlights', 'tone'),
  toneLiftedShadows: t('提亮暗部', 'lifted shadows, filmic shadow detail', 'tone'),
  toneDesaturated: t('低饱和褪色', 'desaturated, muted faded colors', 'tone'),
  toneSaturated: t('高饱和', 'rich saturated colors', 'tone'),
  toneVibrant: t('自然饱和', 'vibrant yet natural skin tones', 'tone', 0.4),

  // ── 质感 ──
  grainHeavy: t('明显胶片颗粒', 'heavy analog film grain', 'texture'),
  grainFine: t('细腻颗粒', 'fine film grain', 'texture'),
  grainClean: t('极致干净', 'pristine clean, noise-free', 'texture'),
  grainDigital: t('数码噪点', 'digital sensor noise', 'texture'),
  bloomSoft: t('柔和泛光', 'soft blooming glow', 'texture'),
  halation: t('高光红晕', 'halation, red-orange glow around highlights', 'texture'),
  chromaAberration: t('边缘色散', 'chromatic aberration at edges', 'texture', 0.4),
  lensDirt: t('镜头光斑', 'lens dirt, light leaks', 'texture', 0.3),

  // ── 氛围 ──
  timeDawn: t('黎明', 'dawn light, soft pink sky', 'atmosphere'),
  timeMorning: t('清晨', 'morning light, clean and fresh', 'atmosphere'),
  timeNoon: t('正午', 'midday harsh sun', 'atmosphere'),
  timeAfternoon: t('午后', 'afternoon light', 'atmosphere'),
  timeGolden: t('黄金时刻', 'golden hour warm sunlight, long soft shadows', 'atmosphere'),
  timeBlue: t('蓝调时刻', 'blue hour twilight, cool ambient blue', 'atmosphere'),
  timeDusk: t('黄昏', 'dusk, fading warm light', 'atmosphere'),
  timeNight: t('夜晚', 'night scene, low ambient light', 'atmosphere'),
  timeLateNight: t('深夜', 'late night, darkest ambient', 'atmosphere'),
  weatherClear: t('晴朗', 'clear sky', 'atmosphere', 0.3),
  weatherCloudy: t('多云', 'partly cloudy', 'atmosphere', 0.3),
  weatherOvercast: t('阴天', 'overcast sky', 'atmosphere', 0.4),
  weatherRain: t('雨天', 'rainy day, wet reflective surfaces', 'atmosphere'),
  weatherSnow: t('雪天', 'snowy day, cold white landscape', 'atmosphere'),
  weatherFog: t('雾天', 'foggy atmosphere, low visibility', 'atmosphere'),
  weatherDust: t('沙尘', 'dusty air, dry haze', 'atmosphere'),
  hazeNone: t('通透空气', 'clear crisp air', 'atmosphere', 0.2),
  hazeMist: t('薄雾', 'thin mist, soft diffusion', 'atmosphere'),
  hazeFog: t('浓雾', 'dense fog, hazy atmosphere', 'atmosphere'),
  hazeSmoke: t('烟雾', 'smoke in the air', 'atmosphere'),
  hazeSteam: t('蒸汽', 'rising steam', 'atmosphere'),
  hazeDustMotes: t('空气尘埃', 'visible dust motes in light', 'atmosphere'),
  hazeRainStreaks: t('雨丝', 'rain streaks, falling droplets', 'atmosphere'),
  hazeGodRays: t('体积光束', 'volumetric god rays, light shafts', 'atmosphere'),
  seasonSpring: t('春季', 'spring season, fresh green', 'atmosphere', 0.4),
  seasonSummer: t('夏季', 'summer season', 'atmosphere', 0.3),
  seasonAutumn: t('秋季', 'autumn palette, warm earthy tones', 'atmosphere'),
  seasonWinter: t('冬季', 'winter season, cold bare', 'atmosphere'),

  // ── 风格与情绪 ──
  moodCinematic: t('电影感', 'cinematic, filmic', 'style'),
  moodWarm: t('温暖治愈', 'warm, comforting', 'style'),
  moodCold: t('冷峻疏离', 'cold, detached, austere', 'style'),
  moodNostalgic: t('怀旧', 'nostalgic, vintage', 'style'),
  moodDocumentary: t('纪实粗粝', 'raw documentary realism', 'style'),
  moodDreamy: t('梦幻', 'dreamy, ethereal', 'style'),
  moodNoir: t('黑色电影', 'film noir, shadowy', 'style'),
  moodLuxury: t('奢华商业', 'luxury commercial, premium', 'style'),
  moodCyberpunk: t('赛博朋克', 'cyberpunk, futuristic neon', 'style'),
  moodMinimal: t('极简', 'minimal, clean, uncluttered', 'style'),
  moodTense: t('压抑紧张', 'tense, suspenseful, uneasy', 'style'),
  moodRomantic: t('浪漫', 'romantic, intimate tender', 'style'),

  // ── 机身与画幅 ──
  sensorFullFrame: t('全画幅', 'full-frame look, high latitude', 'quality', 0.4),
  sensorApsc: t('APS-C', 'APS-C crop', 'quality', 0.3),
  sensorM43: t('微型系统', 'micro four thirds', 'quality', 0.3),
  sensorS35: t('Super35 电影机', 'Super35 cinema camera', 'quality', 0.4),
  sensor65: t('65mm 大画幅', '65mm large format', 'quality', 0.3),
  filmBack: t('胶片背板', 'film back, organic vignetting', 'texture', 0.3),

  // ── 画质 ──
  qHighDetail: t('高细节', 'highly detailed, sharp focus', 'quality'),
  qFilmLook: t('胶片质感', 'film photograph, analog texture', 'quality'),
} as const

export type TokenKey = keyof typeof TOKENS
