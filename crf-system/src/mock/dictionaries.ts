/**
 * 下拉选项 / 评分文字描述字典 (plan.md §5、§6)
 * 所有选项文字严格按照 CRF 原文，Demo 与表单组件共用。
 */

export interface CenterInfo {
  id: string;
  name: string;
}
export const CENTERS: CenterInfo[] = [
  { id: '01', name: '中国中医科学院广安门医院呼吸科' },
  { id: '02', name: '中国中医科学院广安门医院耳鼻喉科' },
  { id: '03', name: '中国中医科学院西苑医院' },
  { id: '04', name: '北京中医药大学东直门医院' },
];
export const CENTER_NAME: Record<string, string> = Object.fromEntries(
  CENTERS.map((c) => [c.id, c.name]),
);

export const ENVIRONMENT_EXPOSURE = ['粉尘', '宠物', '装修史', '无'] as const;
export const DIET_HABIT = ['辛辣', '生冷', '清淡', '其他'] as const;
export const LIVING_ENVIRONMENT = ['通风良好', '霉斑', '尘螨', '其他'] as const;
export const CLIMATE = ['潮湿', '干燥', '寒冷', '温热'] as const;
export const PERENNIAL_ALLERGEN = ['尘螨', '蟑螂', '动物皮屑', '不详'] as const;
export const COMORBIDITIES = [
  '鼻窦炎',
  '鼻息肉',
  '过敏性哮喘',
  '过敏性结膜炎',
  '睡眠障碍',
  '特应性皮炎',
  '食物过敏',
  '无',
] as const;

/** 入选标准 6 项 (CRF p12) */
export const INCLUSION_CRITERIA = [
  '确诊为过敏性鼻炎患者，病程≥2年',
  '符合中医鼻鼽风寒犯鼻证',
  '年龄 18-60 岁，性别不限',
  '过敏原SPT和/或血清特异性IgE阳性，或鼻激发试验阳性',
  '至少有一个主要鼻部症状在中度以上（四分法评分≥2分）',
  '符合GCP规定，签署知情同意书，自愿受试',
] as const;

/** 排除标准 11 项 (CRF p13) — 文字按处方规约展示，共 11 条 */
export const EXCLUSION_CRITERIA = [
  '合并鼻息肉、鼻窦炎、鼻腔结构异常等其他鼻部疾病',
  '急性感染、伴有发热者',
  '妊娠期、哺乳期或准备妊娠妇女',
  '严重心、肝、肾功能不全者',
  '患有恶性肿瘤或血液系统疾病者',
  '精神疾病患者或不能配合者',
  '参加其他药物临床研究或3个月内参加过者',
  '对研究药物成分过敏者',
  '正在使用或近期使用糖皮质激素、抗组胺药影响疗效判定者',
  '合并贫血、白细胞减少等血液学异常者',
  '研究者认为不适合纳入的其他情况',
] as const;

/** 四分法评分文字描述 CRF 原始文案 (plan.md §5.4 模块L) */
export const FOUR_SCALE_DESC: Record<
  string,
  { label: string; options: { value: number; desc: string }[] }
> = {
  sneeze: {
    label: '喷嚏',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '每日3-5次' },
      { value: 2, desc: '每日6-10次' },
      { value: 3, desc: '每日≥11次' },
    ],
  },
  rhinorrhea: {
    label: '流涕',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '少量分泌物，仅前鼻孔可见，无需擦拭' },
      { value: 2, desc: '分泌物中等，超过前鼻孔，需间断擦拭' },
      { value: 3, desc: '分泌物大量，沿鼻唇沟下流，需持续擦拭' },
    ],
  },
  nasalItch: {
    label: '鼻痒',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '间断性鼻痒，可忍受' },
      { value: 2, desc: '鼻痒明显，令人厌烦但可忍受' },
      { value: 3, desc: '鼻痒难以忍受，影响日常生活' },
    ],
  },
  nasalCongestion: {
    label: '鼻塞',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '有意识吸气时感觉鼻塞，无张口呼吸' },
      { value: 2, desc: '间歇性或交替性鼻塞，伴张口呼吸' },
      { value: 3, desc: '几乎全天张口呼吸' },
    ],
  },
  eyeItch: {
    label: '眼痒/异物感/眼红',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '间断性，可忍受' },
      { value: 2, desc: '症状明显，令人厌烦但可忍受' },
      { value: 3, desc: '难以忍受，影响日常生活' },
    ],
  },
  lacrimation: {
    label: '流泪',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '间断性，可忍受' },
      { value: 2, desc: '症状明显，令人厌烦但可忍受' },
      { value: 3, desc: '难以忍受，影响日常生活' },
    ],
  },
};

/** VAS 症状条目 */
export const VAS_ITEMS: { key: string; label: string }[] = [
  { key: 'sneeze', label: '喷嚏' },
  { key: 'rhinorrhea', label: '流涕' },
  { key: 'nasalItch', label: '鼻痒' },
  { key: 'nasalCongestion', label: '鼻塞' },
  { key: 'eyeItch', label: '眼痒' },
  { key: 'lacrimation', label: '流泪' },
];

/** 中医证候评分主症（0/2/4/6 分制）— 卡片式描述 */
export const TCM_MAIN_SYMPTOMS: { key: string; label: string; options: { value: number; desc: string }[] }[] = [
  {
    key: 'nasalItch',
    label: '鼻痒',
    options: [
      { value: 0, desc: '无' },
      { value: 2, desc: '轻微，间断' },
      { value: 4, desc: '明显，持续，可忍受' },
      { value: 6, desc: '剧烈，难以忍受' },
    ],
  },
  {
    key: 'sneeze',
    label: '阵发性/连续喷嚏',
    options: [
      { value: 0, desc: '无' },
      { value: 2, desc: '每日 3-5 次' },
      { value: 4, desc: '每日 6-10 次' },
      { value: 6, desc: '每日 ≥11 次' },
    ],
  },
  {
    key: 'rhinorrhea',
    label: '流清涕',
    options: [
      { value: 0, desc: '无' },
      { value: 2, desc: '少量，鼻前孔可见' },
      { value: 4, desc: '中等量，需间断擦拭' },
      { value: 6, desc: '大量，需持续擦拭' },
    ],
  },
  {
    key: 'nasalCongestion',
    label: '鼻塞',
    options: [
      { value: 0, desc: '无' },
      { value: 2, desc: '吸气时有感，伴张口呼吸' },
      { value: 4, desc: '间歇性或交替性' },
      { value: 6, desc: '几乎全天张口呼吸' },
    ],
  },
];

/** 中医证候评分次症（0/1/2/3 分制） */
export const TCM_SUB_SYMPTOMS: { key: string; label: string; options: { value: number; desc: string }[] }[] = [
  {
    key: 'windColdAversion',
    label: '怕风怕冷',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '轻度怕风冷' },
      { value: 2, desc: '怕风冷欲披衣被' },
      { value: 3, desc: '怕风冷披衣被而不能解' },
    ],
  },
  {
    key: 'bodyAche',
    label: '周身酸痛',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '偶发局部酸痛，可自行缓解' },
      { value: 2, desc: '多处酸痛，活动后稍加重，轻度影响活动' },
      { value: 3, desc: '全身酸痛剧烈，活动受限，影响日常行动' },
    ],
  },
  {
    key: 'sweating',
    label: '汗出',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '轻微少汗，仅活动后少量汗出' },
      { value: 2, desc: '明显少汗，活动后汗出极少，皮肤干燥' },
      { value: 3, desc: '完全无汗，剧烈活动也无汗，周身发紧' },
    ],
  },
  {
    key: 'cough',
    label: '咳嗽',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '偶发咳嗽，每日≤3声' },
      { value: 2, desc: '间断咳嗽，每日4-10声，轻微影响日常' },
      { value: 3, desc: '频繁咳嗽，每日≥11声，影响睡眠日常' },
    ],
  },
  {
    key: 'paleFace',
    label: '面色淡白',
    options: [
      { value: 0, desc: '无' },
      { value: 1, desc: '面色稍淡，无苍白感' },
      { value: 2, desc: '面色明显淡白，略带苍白' },
      { value: 3, desc: '面色苍白无华，精神萎靡' },
    ],
  },
];

/** RQLQ 28 问（plan.md §6.4，维度化）— 问题文字按 CRF 规约化 */
export const RQLQ_QUESTIONS: { key: string; label: string; questions: string[] }[] = [
  { key: 'activityLimit', label: '活动受限（Q1-Q3）', questions: ['日常生活活动受影响', '工作/学习受影响', '社会活动受影响'] },
  { key: 'sleep', label: '睡眠（Q4-Q6）', questions: ['入睡困难', '夜间憋醒', '睡眠质量下降'] },
  { key: 'nonNasalEye', label: '非鼻/眼症状（Q7-Q13）', questions: ['精力下降', '工作效率下降', '疲惫', '口渴', '乏力', '注意力不集中', '头痛'] },
  { key: 'practicalProblems', label: '实际问题（Q14-Q16）', questions: ['需要擤鼻涕', '需要揉擦鼻/眼', '需携带纸巾'] },
  { key: 'nasalSymptoms', label: '鼻部症状（Q17-Q20）', questions: ['鼻塞', '流清涕', '打喷嚏', '鼻痒'] },
  { key: 'eyeSymptoms', label: '眼部症状（Q21-Q24）', questions: ['眼痒', '流泪', '眼干', '眼肿'] },
  { key: 'emotion', label: '情绪（Q25-Q27）', questions: ['容易尴尬', '沮丧', '不耐烦/爱发脾气'] },
];

/** 不良事件各字段映射（plan.md §5.10） */
export const AE_SEVERITY = [
  { value: 1, label: '1级（轻度）' },
  { value: 2, label: '2级（中度）' },
  { value: 3, label: '3级（重度）' },
];
export const AE_DRUG_MEASURE = [
  { value: 1, label: '维持原状' },
  { value: 2, label: '退出试验' },
  { value: 3, label: '减少剂量' },
  { value: 4, label: '增加剂量' },
  { value: 5, label: '中断用药' },
];
export const AE_OTHER_MEASURE = [
  { value: 1, label: '无' },
  { value: 2, label: '住院治疗' },
  { value: 3, label: '合并用药' },
  { value: 4, label: '合并非药物治疗' },
];
export const AE_RELATION = [
  { value: 1, label: '肯定有关' },
  { value: 2, label: '很可能有关' },
  { value: 3, label: '可能有关' },
  { value: 4, label: '可能无关' },
  { value: 5, label: '无关' },
];
export const AE_OUTCOME = [
  { value: 1, label: '无变化' },
  { value: 2, label: '病情恶化' },
  { value: 3, label: '恢复/治愈' },
  { value: 4, label: '改善中/恢复中' },
  { value: 5, label: '恢复留有后遗症' },
  { value: 6, label: '死亡' },
];
export const SAE_TYPE = [
  { value: 1, label: '导致死亡' },
  { value: 2, label: '危及生命' },
  { value: 3, label: '导致住院或住院时间延长' },
  { value: 4, label: '导致永久或显著的残疾/功能丧失' },
  { value: 5, label: '先天性畸形/出生缺陷' },
  { value: 6, label: '需要干预以防永久性损害' },
  { value: 7, label: '其他重要医学事件' },
];

/** 完成情况：退出原因 9 项（CRF p41） */
export const WITHDRAWAL_REASONS = [
  { value: 1, label: '发生不良事件（包括胃肠道不良反应）、有临床意义的实验室指标变化或异常' },
  { value: 2, label: '使用禁忌的伴随用药' },
  { value: 3, label: '患者出现怀孕或打算怀孕' },
  { value: 4, label: '患者撤回知情同意' },
  { value: 5, label: '患者依从性差' },
  { value: 6, label: '患者试验期间参加其他临床试验' },
  { value: 7, label: '患者失访' },
  { value: 8, label: '患者死亡' },
  { value: 9, label: '其他' },
];

/** 生命体征校验区间说明 */
export const VITAL_RANGES = {
  temperature: [35, 42],
  pulse: [40, 200],
  systolicBP: [60, 250],
  diastolicBP: [30, 150],
  respiration: [8, 40],
} as const;
