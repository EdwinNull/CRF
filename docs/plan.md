
# 荆防合剂过敏性鼻炎临床研究 — CRF电子化录入系统 前端开发计划

> **文档目的**：本文档是前端原型开发的完整技术规格书，可直接交付 AI 编码工具（如 Codex）执行。
> **交付目标**：一个可在浏览器运行的前端 Demo，使用 mock 数据，覆盖 CRF 表全部字段和交互流程，用于向医院团队演示。

---

## 1. 技术栈与项目初始化

```bash
npx create-react-app crf-system --template typescript
cd crf-system
npm install antd @ant-design/icons react-router-dom dayjs xlsx file-saver
npm install -D @types/file-saver
```

| 依赖                  | 用途                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| React 18 + TypeScript | 核心框架                                                              |
| Ant Design 5.x        | UI 组件库（Form, Table, Tabs, Steps, Slider, Select, InputNumber 等） |
| React Router v6       | 路由                                                                  |
| dayjs                 | 日期处理                                                              |
| xlsx (SheetJS)        | 前端 Excel 导出（Demo 阶段在前端直接生成）                            |
| file-saver            | 触发浏览器下载                                                        |

### 全局配置

- Ant Design 设置 `locale` 为 `zh_CN`
- 主色调：`#1677ff`（Ant Design 默认蓝，医疗系统适配）
- 在 `App.tsx` 中用 `ConfigProvider` 包裹全局

---

## 2. 目录结构

```
src/
├── App.tsx                    # 路由定义 + Layout
├── index.tsx
├── types/                     # TypeScript 类型定义
│   ├── patient.ts             # 患者相关类型
│   ├── visit.ts               # 访视数据类型
│   ├── adverseEvent.ts        # 不良事件类型
│   └── concomitantMed.ts      # 合并用药类型
├── mock/                      # Mock 数据
│   ├── patients.ts            # 预置 5-8 个患者数据
│   └── dictionaries.ts        # 下拉选项字典
├── store/                     # 状态管理（用 React Context）
│   └── PatientContext.tsx     # 全局患者数据 Context
├── pages/
│   ├── Login/
│   │   └── index.tsx          # 登录页
│   ├── PatientList/
│   │   └── index.tsx          # 患者列表页
│   ├── PatientDetail/
│   │   ├── index.tsx          # 患者详情容器（含 Tab 导航）
│   │   ├── VisitV1.tsx        # V1 筛查期表单
│   │   ├── VisitV2.tsx        # V2 治疗期 D7
│   │   ├── VisitV3.tsx        # V3 治疗期 D14
│   │   ├── VisitV4.tsx        # V4 治疗期 D28
│   │   ├── VisitV5.tsx        # V5 随访期 M2
│   │   ├── VisitV6.tsx        # V6 随访期 M3
│   │   ├── AdverseEvents.tsx  # 不良事件录入
│   │   ├── ConcomitantMed.tsx # 合并用药录入
│   │   ├── NonDrugTherapy.tsx # 合并非药物治疗
│   │   └── Completion.tsx     # 实验完成情况总结
│   └── Export/
│       └── index.tsx          # 数据导出页
├── components/                # 可复用组件
│   ├── VASSlider.tsx          # VAS 评分滑条组件
│   ├── SymptomScoreCard.tsx   # 四分法症状评分卡片
│   ├── RQLQForm.tsx           # RQLQ 问卷表单
│   ├── TCMScoreForm.tsx       # 中医证候评分表单
│   ├── MedScoreForm.tsx       # 药物评分表单
│   ├── VitalSignsForm.tsx     # 生命体征表单
│   ├── LabResultsForm.tsx     # 实验室检查表单
│   ├── EfficacyForm.tsx       # 疗效评估表单
│   ├── DrugRecoveryForm.tsx   # 药物回收/发放表单
│   └── FormSection.tsx        # 表单分区容器（带标题和折叠功能）
└── utils/
    ├── exportExcel.ts         # Excel 导出逻辑
    ├── validators.ts          # 表单校验规则
    └── scoring.ts             # 自动计算（总分、疗效指数、依从性等）
```

---

## 3. TypeScript 类型定义

### 3.1 patient.ts

```typescript
export interface Patient {
  id: string;                     // UUID
  centerId: '01' | '02' | '03' | '04';  // 研究中心编号
  screeningNo: string;            // 筛选号，5位，如 "01005"
  randomNo: string;               // 随机编号，3位，如 "048"
  nameAbbr: string;               // 姓名拼音缩写，4位
  enrollmentDate: string;         // 入组日期 "YYYY-MM-DD"
  status: 'screening' | 'treatment' | 'followup' | 'completed' | 'withdrawn';

  // V1 人口学资料
  demographics: {
    gender: '男' | '女';
    age: number;
    household: string;            // 户籍
    weight: number;               // kg，保留1位小数
    height: number;               // cm，保留1位小数
    bmi: number;                  // 自动计算，保留1位小数
    occupation: string;
    environmentExposure: string[];  // ['粉尘', '宠物', '装修史', '无'] 多选
    smokingHistory: {
      has: boolean;
      years?: number;
      packsPerDay?: number;
      quitYears?: number;
    };
    drinkingHistory: {
      has: boolean;
      years?: number;
      mlPerDay?: number;
      quitYears?: number;
    };
    dietHabit: string[];          // ['辛辣', '生冷', '清淡', '其他']
    livingEnvironment: string[];  // ['通风良好', '霉斑', '尘螨', '其他']
    climate: string[];            // ['潮湿', '干燥', '寒冷', '温热']
  };

  // V1 病史
  allergyHistory: {
    has: boolean;
    drugAllergy?: string;
    nonDrugAllergy?: string;
  };
  respiratoryHistory: {
    has: boolean;
    records?: Array<{
      diseaseName: string;
      diagnosisDate: string;
      isOngoing: boolean;
      endDate?: string;
    }>;
  };
  familyHistory: {
    has: boolean;
    detail?: string;
  };
  priorTreatment: {
    has: boolean;
    tcmHistory?: {
      has: boolean;
      formulaName?: string;
      course?: string;
      efficacy?: '好' | '一般' | '差';
    };
    immunotherapy?: {
      status: '未接受' | '接受中' | '已完成';
      course?: string;
      endTime?: string;
      efficacy?: '好' | '一般' | '差';
    };
    currentMedications?: Array<{
      drugName: string;
      dailyDose: string;
      unit: string;
      route: string;
      startDate: string;
      isOngoing: boolean;
      endDate?: string;
    }>;
  };

  // V1 现病史
  currentIllness: {
    diagnosisDate: string;
    attackCycle: '常年性' | '季节性';
    perennialAllergen?: string[];  // ['尘螨', '蟑螂', '动物皮屑', '不详']
    seasonalSeason?: string;
    seasonalAllergen?: string;
    comorbidities: string[];       // 多选
    allergenTest: {
      done: boolean;
      testDate?: string;
      totalIgE?: number;
      skinPrickPositive?: boolean | null;
      serumIgE?: number;
      nasalChallengePositive?: boolean | null;
    };
    triggerFactors: {
      has: boolean;
      detail?: string;
    };
  };

  // V1 中医四诊（仅在 V1 采集的望闻问切）
  tcmFourExam: {
    nasalMucosa: '淡白肿胀' | '红肿充血';
    nasalDischarge: '清稀如水' | '黄黏成缕';
    tongueBody: '淡红' | '淡白' | '红赤';
    tongueCoating: '薄白' | '薄黄';
    throat: '咽壁淡红、不肿' | '咽峡充血、微肿';
    sneeze: '低频有力' | '高频短促';
    worseCondition: '遇冷' | '遇热' | '无';
    stool: '溏' | '干' | '正常';
    urine: '清' | '黄赤';
    pulse: '浮紧' | '浮缓' | '浮数';
  };

  // V1 入选/排除标准
  inclusionCriteria: boolean[];    // 6 项，全部为 true 才通过
  exclusionCriteria: boolean[];    // 11 项，全部为 false 才通过
  screeningResult: 'pass' | 'fail';
  screeningFailReason?: string;

  // 访视数据
  visits: Record<string, VisitData>;   // key = 'V1' | 'V2' | ... | 'V6'

  // 跨访视数据
  adverseEvents: AdverseEvent[];
  concomitantMeds: ConcomitantMed[];
  nonDrugTherapies: NonDrugTherapy[];

  // 完成情况
  completion?: CompletionSummary;
}
```

### 3.2 visit.ts

```typescript
export interface VitalSigns {
  temperature: number;       // ℃，保留1位小数
  pulse: number;             // 次/分
  systolicBP: number;        // 收缩压 mmHg
  diastolicBP: number;       // 舒张压 mmHg
  respiration: number;       // 次/分
}

export interface VASScores {
  sneeze: number;            // 0-10
  rhinorrhea: number;        // 0-10
  nasalItch: number;         // 0-10
  nasalCongestion: number;   // 0-10
  eyeItch: number;           // 0-10
  lacrimation: number;       // 0-10
  total: number;             // 自动求和
}

export interface SymptomFourScale {
  sneeze: 0 | 1 | 2 | 3;
  rhinorrhea: 0 | 1 | 2 | 3;
  nasalItch: 0 | 1 | 2 | 3;
  nasalCongestion: 0 | 1 | 2 | 3;
  eyeItch: 0 | 1 | 2 | 3;
  lacrimation: 0 | 1 | 2 | 3;
  nasalTotal: number;        // 前4项求和
  totalScore: number;        // 6项求和
}

export interface RQLQScores {
  // 活动受限 Q1-Q3
  activityLimit: [number, number, number];
  // 睡眠 Q4-Q6
  sleep: [number, number, number];
  // 非鼻/眼症状 Q7-Q13
  nonNasalEye: [number, number, number, number, number, number, number];
  // 实际问题 Q14-Q16
  practicalProblems: [number, number, number];
  // 鼻部症状 Q17-Q20
  nasalSymptoms: [number, number, number, number];
  // 眼部症状 Q21-Q24
  eyeSymptoms: [number, number, number, number];
  // 情绪 Q25-Q28
  emotion: [number, number, number, number];
  total: number;             // 28项求和
}

export interface TCMScores {
  // 主症（0/2/4/6）
  nasalItch: 0 | 2 | 4 | 6;
  sneeze: 0 | 2 | 4 | 6;
  rhinorrhea: 0 | 2 | 4 | 6;
  nasalCongestion: 0 | 2 | 4 | 6;
  // 次症（0/1/2/3）
  windColdAversion: 0 | 1 | 2 | 3;
  bodyAche: 0 | 1 | 2 | 3;
  sweating: 0 | 1 | 2 | 3;
  cough: 0 | 1 | 2 | 3;
  paleFace: 0 | 1 | 2 | 3;
  // 自由文本
  tongueDesc: string;
  pulseDesc: string;
  total: number;             // 自动求和
}

export interface MedScore {
  oralAntihistamine: { selected: boolean; days: number; total: number; };   // 每日1分
  nasalAntihistamine: { selected: boolean; days: number; total: number; };  // 每日1分
  eyeAntihistamine: { selected: boolean; days: number; total: number; };    // 每日1分
  nasalSteroid: { selected: boolean; days: number; total: number; };        // 每日2分
  oralCorticosteroid: { selected: boolean; days: number; total: number; };  // 每日3分
  grandTotal: number;
}

export interface LabBloodRoutine {
  sampleDate: string;
  hb: { value: number | null; unit: 'g/L'; status: 'normal' | 'abnormal_no_significance' | 'abnormal_significant' | 'not_done'; };
  rbc: { value: number | null; unit: '10^12/L'; status: string; };
  wbc: { value: number | null; unit: '10^9/L'; status: string; };
  neu: { value: number | null; unit: '10^9/L'; status: string; };
  eos: { value: number | null; unit: '10^9/L'; status: string; };
  bas: { value: number | null; unit: '10^9/L'; status: string; };
  lym: { value: number | null; unit: '10^9/L'; status: string; };
  plt: { value: number | null; unit: '10^9/L'; status: string; };
}

export interface LabUrinalysis {
  sampleDate: string;
  protein: { value: '-' | '±' | '+' | '++' | '+++'; status: string; };
  glucose: { value: '-' | '±' | '+' | '++' | '≥+++'; status: string; };
  ketone: { value: '-' | '±' | '+' | '++' | '+++'; status: string; };
  occultBlood: { value: '阴性' | '阳性'; status: string; };
  leukocyte: { value: '阴性' | '阳性'; status: string; };
}

export interface LabBiochemistry {
  sampleDate: string;
  alt: { value: number | null; unit: 'U/L'; status: string; };
  ast: { value: number | null; unit: 'U/L'; status: string; };
  bun: { value: number | null; unit: 'mmol/L'; status: string; };
  cr: { value: number | null; unit: 'μmol/L'; status: string; };
}

export interface FeNO {
  done: boolean;
  testDate?: string;
  oralValue?: number;        // ppb
  oralStatus?: '正常' | '升高';
  nasalValue?: number;       // ppb
  nasalStatus?: '正常' | '升高';
}

export interface ECG {
  done: boolean;
  testDate?: string;
  result?: '正常' | '异常无临床意义' | '异常有临床意义';
  detail?: string;
}

export interface EfficacyAssessment {
  efficacyIndex: number | null;      // 百分比，自动计算
  efficacyLevel: '临床控制' | '显效' | '有效' | '无效' | null;
  allSymptomsRelieved: boolean;
  reliefDate?: string;
  currentSymptoms?: string;
  worsened: boolean;
  worsenedDetail?: string;
  newComplication: boolean;
  newComplicationDetail?: string;
}

export interface DrugRecovery {
  returnedCount: number;     // 回收药物支数
  expectedCount: number;     // 应服药物支数
  compliance: number;        // 自动计算百分比
  dispensedCount: number;    // 发放药物支数
}

export interface VisitData {
  visitNo: 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';
  visitDate: string;
  status: 'not_started' | 'draft' | 'submitted';

  vitalSigns: VitalSigns;
  vasScores: VASScores;
  symptomFourScale: SymptomFourScale;
  rqlqScores: RQLQScores;
  tcmScores: TCMScores;

  // 以下字段根据访视节点有无而决定是否存在
  labBlood?: LabBloodRoutine;         // V1, V3, V4
  labUrine?: LabUrinalysis;           // V1, V3, V4
  labBiochem?: LabBiochemistry;       // V1, V3, V4
  feno?: FeNO;                        // V1, V4
  ecg?: ECG;                          // V1, V4
  serumIgE?: { done: boolean; testDate?: string; value?: number; };  // 仅 V4

  medScore?: MedScore;                // V2-V6
  drugRecovery?: DrugRecovery;        // V2-V4
  efficacy?: EfficacyAssessment;      // V2-V6

  // V2-V4 特有
  hasAdverseEvent?: boolean;
  hasNewConcomitantMed?: boolean;
}
```

### 3.3 adverseEvent.ts

```typescript
export interface AdverseEvent {
  id: string;
  seqNo: number;                  // 编号 1, 2, 3...
  eventName: string;
  description: string;
  startDate: string;
  isOngoing: boolean;
  endDate?: string;
  severity: 1 | 2 | 3;           // 1=轻度 2=中度 3=重度
  drugMeasure: 1 | 2 | 3 | 4 | 5;  // 维持/退出/减量/增量/中断
  otherMeasure: 1 | 2 | 3 | 4;     // 无/住院/合并用药/合并非药物
  otherMeasureDetail?: string;
  drugRelation: 1 | 2 | 3 | 4 | 5; // 肯定有关 ~ 无关
  outcome: 1 | 2 | 3 | 4 | 5 | 6;  // 无变化 ~ 死亡
  isSAE: boolean;
  saeType?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
```

### 3.4 concomitantMed.ts

```typescript
export interface ConcomitantMed {
  id: string;
  seqNo: number;
  drugName: string;
  indication: string;
  dosageForm: string;
  dosageAmount: string;
  startDate: string;
  isOngoing: boolean;
  endDate?: string;
  drugRelation: string;
  remark?: string;
}

export interface NonDrugTherapy {
  id: string;
  seqNo: number;
  therapyName: string;
  therapyType: string;
  methodFrequency: string;
  location: string;
  startDate: string;
  isOngoing: boolean;
  endDate?: string;
  drugRelation: string;
  remark?: string;
}

export interface CompletionSummary {
  completedTreatment: boolean;
  completionDate?: string;
  lastDoseDate?: string;
  hadFinalVisit?: boolean;
  noFinalVisitReason?: string;
  withdrawalReason?: string;       // 退出原因（单选）
  withdrawalDetail?: string;
  aeSeqNo?: number;                // 如因AE退出，关联AE编号
  deathDate?: string;
  deathCause?: string;
}
```

---

## 4. 路由设计

```typescript
// App.tsx 中的路由定义
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<AppLayout />}>
    <Route index element={<PatientList />} />
    <Route path="patient/:id" element={<PatientDetail />}>
      <Route index element={<Navigate to="v1" />} />
      <Route path="v1" element={<VisitV1 />} />
      <Route path="v2" element={<VisitV2 />} />
      <Route path="v3" element={<VisitV3 />} />
      <Route path="v4" element={<VisitV4 />} />
      <Route path="v5" element={<VisitV5 />} />
      <Route path="v6" element={<VisitV6 />} />
      <Route path="adverse-events" element={<AdverseEvents />} />
      <Route path="concomitant-med" element={<ConcomitantMed />} />
      <Route path="non-drug-therapy" element={<NonDrugTherapy />} />
      <Route path="completion" element={<Completion />} />
    </Route>
    <Route path="export" element={<Export />} />
  </Route>
</Routes>
```

---

## 5. 页面详细规格

### 5.1 登录页 `/login`

**布局**：居中卡片式登录框

**字段**：

- 研究中心：下拉选择，选项为
  - `01` — 中国中医科学院广安门医院呼吸科
  - `02` — 中国中医科学院广安门医院耳鼻喉科
  - `03` — 中国中医科学院西苑医院
  - `04` — 北京中医药大学东直门医院
- 用户名：文本输入
- 密码：密码输入

**Mock 逻辑**：任意用户名密码即可登录，将 centerId 存入 Context/localStorage。

**UI 要素**：

- 页面顶部居中显示研究名称"荆防合剂治疗过敏性鼻炎的临床研究"
- 副标题"CRF 电子化录入系统"
- 登录按钮文字"进入系统"

---

### 5.2 患者列表页 `/`

**布局**：Ant Design `Layout` + `Sider`（侧边栏导航）+ `Content`

**侧边栏菜单项**：

1. 📋 患者列表（当前页）
2. 📥 数据导出

**页面内容**：

**顶部操作栏**：

- 左侧：`Button type="primary"` "新建患者"
- 右侧：搜索栏（筛选号/随机编号搜索）+ 状态筛选下拉（全部/筛选中/治疗中/随访中/已完成/退出）

**患者列表表格**（Ant Design `Table`）：

| 列名     | 字段           | 宽度  | 说明                                         |
| -------- | -------------- | ----- | -------------------------------------------- |
| 筛选号   | screeningNo    | 100px | 可搜索                                       |
| 随机编号 | randomNo       | 100px | 筛选成功后才有                               |
| 姓名缩写 | nameAbbr       | 100px |                                              |
| 研究中心 | centerId       | 180px | 显示中心全称                                 |
| 入组日期 | enrollmentDate | 120px |                                              |
| 当前状态 | status         | 120px | 用 Tag 组件，不同颜色                        |
| 访视进度 | —             | 150px | 用 Progress 或 Steps 组件，显示已完成到 V 几 |
| 操作     | —             | 100px | "进入"按钮，跳转到患者详情                   |

**状态 Tag 颜色映射**：

- `screening` → 蓝色 "筛选中"
- `treatment` → 绿色 "治疗中"
- `followup` → 橙色 "随访中"
- `completed` → 灰色 "已完成"
- `withdrawn` → 红色 "已退出"

**新建患者弹窗**（Modal）：

- 研究中心编号：自动填充当前登录中心，不可编辑
- 筛选号：前2位自动填充中心编号，后3位手动输入
- 姓名拼音缩写：4个单独的字母输入框，只允许大写字母
- 性别、年龄、身高、体重：基本信息
- 点击"创建"后跳转到该患者的 V1 表单

---

### 5.3 患者详情页 `/patient/:id`

**布局**：

顶部面包屑：`患者列表 > 01005 张XX`

**左侧垂直 Tab 导航**（Ant Design `Tabs` with `tabPosition="left"`）：

```
┌─────────────────┐
│ V1 筛查期        │  ← 绿色圆点表示已完成
│ V2 D7           │  ← 蓝色圆点表示进行中
│ V3 D14          │  ← 灰色表示未开始
│ V4 D28          │
│ V5 M2           │
│ V6 M3           │
│ ─────────────── │
│ ⚠ 不良事件       │  ← 有记录时显示数字角标
│ 💊 合并用药       │
│ 🏥 非药物治疗     │
│ ─────────────── │
│ 📄 完成情况总结   │
└─────────────────┘
```

**Tab 状态指示器**：

- 已提交的访视：绿色 ✓ 图标
- 有草稿的访视：蓝色编辑图标
- 未开始的访视：灰色圆圈
- 未到时间的访视：禁用状态（Disabled），tooltip 提示"未到访视时间"

**右侧内容区**：

- 顶部固定显示患者基本信息卡片：筛选号、随机编号、姓名缩写、入组日期、当前状态
- 下方为对应 Tab 的表单内容
- 底部固定操作栏：`暂存`（保存草稿）和 `提交`（校验+锁定）按钮

---

### 5.4 V1 筛查期表单

这是最复杂的表单，包含以下模块（每个模块用 `FormSection` 折叠面板包裹）：

#### 模块 A：知情同意

| 字段             | 组件       | 说明 |
| ---------------- | ---------- | ---- |
| 知情同意签署日期 | DatePicker | 必填 |

#### 模块 B：人口学资料

| 字段       | 组件             | 说明                                      |
| ---------- | ---------------- | ----------------------------------------- |
| 性别       | Radio            | 男/女                                     |
| 年龄       | InputNumber      | 18-60，整数                               |
| 户籍       | Input            | 文本                                      |
| 体重       | InputNumber      | 保留1位小数，单位 kg                      |
| 身高       | InputNumber      | 保留1位小数，单位 cm                      |
| BMI        | 自动计算显示     | = 体重 / (身高/100)^2，保留1位小数        |
| 职业       | Input            | 文本                                      |
| 环境暴露   | Checkbox.Group   | 粉尘/宠物/装修史/无（选"无"时其他不可选） |
| 吸烟史     | Radio + 条件字段 | 有→展开烟龄/每日包数/戒烟年              |
| 饮酒史     | Radio + 条件字段 | 有→展开酒龄/每日毫升/戒酒年              |
| 饮食习惯   | Checkbox.Group   | 辛辣/生冷/清淡/其他                       |
| 居住环境   | Checkbox.Group   | 通风良好/霉斑/尘螨/其他                   |
| 居住地气候 | Checkbox.Group   | 潮湿/干燥/寒冷/温热                       |

#### 模块 C：生命体征

使用 `VitalSignsForm` 组件。

| 字段   | 组件        | 校验           |
| ------ | ----------- | -------------- |
| 体温   | InputNumber | 35.0 - 42.0 ℃ |
| 脉搏   | InputNumber | 40 - 200 次/分 |
| 收缩压 | InputNumber | 60 - 250 mmHg  |
| 舒张压 | InputNumber | 30 - 150 mmHg  |
| 呼吸   | InputNumber | 8 - 40 次/分   |

#### 模块 D：过敏史

| 字段       | 组件  | 说明                   |
| ---------- | ----- | ---------------------- |
| 有无过敏史 | Radio | 无/药物引起/非药物引起 |
| 过敏详情   | Input | 仅当"有"时展示         |

#### 模块 E：既往呼吸系统疾病

| 字段             | 组件     | 说明                                                                                                               |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| 有无既往呼吸疾病 | Radio    | 无/有                                                                                                              |
| 疾病记录列表     | 动态表格 | 有→展示可增删的行，每行：疾病名称(Input)、确诊日期(DatePicker)、是否持续(Radio)、结束日期(DatePicker，"否"时展示) |

最多 6 行，对应 CRF 预留的 6 个槽位。用 Ant Design 的 `Form.List` 实现动态增删。

#### 模块 F：家族史

| 字段       | 组件  |
| ---------- | ----- |
| 有无家族史 | Radio |
| 详情       | Input |

#### 模块 G：既往治疗史

| 字段           | 组件                                                               |
| -------------- | ------------------------------------------------------------------ |
| 有无既往治疗   | Radio                                                              |
| 中药使用史     | Radio → 方剂名称(Input) + 疗程(Input) + 疗效(Radio: 好/一般/差)   |
| 过敏原免疫治疗 | Radio(未接受/接受中/已完成) → 对应子字段                          |
| 当前用药列表   | 动态表格：药物名称/日剂量/单位/给药途径/开始日期/是否持续/结束日期 |

#### 模块 H：现病史

| 字段       | 组件                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| 确诊时间   | DatePicker                                                                            |
| 发作周期   | Radio(常年性/季节性) → 对应子字段                                                    |
| 合并疾病   | Checkbox.Group: 鼻窦炎/鼻息肉/过敏性哮喘/过敏性结膜炎/睡眠障碍/特应性皮炎/食物过敏/无 |
| 过敏原检测 | 复合区域：是否检测/检测日期/总IgE值/皮肤点刺/血清特异性IgE/鼻内激发                   |
| 诱发因素   | Radio(无/有) + Input                                                                  |

#### 模块 I：中医四诊

| 字段     | 组件  | 选项                        |
| -------- | ----- | --------------------------- |
| 鼻黏膜   | Radio | 淡白肿胀 / 红肿充血         |
| 涕质     | Radio | 清稀如水 / 黄黏成缕         |
| 舌质     | Radio | 淡红 / 淡白 / 红赤          |
| 舌苔     | Radio | 薄白 / 薄黄                 |
| 咽喉     | Radio | 咽壁淡红不肿 / 咽峡充血微肿 |
| 喷嚏     | Radio | 低频有力 / 高频短促         |
| 症状加重 | Radio | 遇冷 / 遇热 / 无            |
| 大便     | Radio | 溏 / 干 / 正常              |
| 小便     | Radio | 清 / 黄赤                   |
| 脉象     | Radio | 浮紧 / 浮缓 / 浮数          |

#### 模块 J：实验室检查

使用 `LabResultsForm` 组件。包含三个子面板：

**J1 血常规**（`LabBloodRoutine`）：采样日期 + 8 项检查，每项包含"实测值(InputNumber) + 结果判定(Radio: 未查/正常/异常无临床意义/异常有临床意义)"

**J2 尿常规**（`LabUrinalysis`）：采样日期 + 5 项，其中蛋白/糖/酮体用 Radio(-/±/+/++/+++)，潜血和白细胞用 Radio(阴性/阳性)

**J3 血生化**（`LabBiochemistry`）：采样日期 + 4 项(ALT/AST/BUN/Cr)

**J4 FeNO**：是否检查 + 检查日期 + 口腔值/鼻腔值 + 正常/升高

**J5 心电图**：是否检查 + 检查日期 + 结果三选一 + 详细描述

#### 模块 K：VAS 评分

使用 `VASSlider` 组件，6 个滑条：

每个症状一行，左侧标签，中间 Ant Design `Slider`（0-10，步长1，带刻度标签），右侧实时显示选中数值和严重程度文字（轻度/中度/重度）。底部自动计算 VAS 总分。

```
VAS评分组件设计：
┌──────────────────────────────────────────┐
│ 喷嚏    ═══════●═══════════  4 中度     │
│ 流涕    ══════════●════════  6 中度     │
│ 鼻痒    ════●══════════════  3 轻度     │
│ 鼻塞    ═══════════●═══════  7 中度     │
│ 眼痒    ══●════════════════  2 轻度     │
│ 流泪    ═●═════════════════  1 轻度     │
│                          VAS总分：23     │
└──────────────────────────────────────────┘
```

#### 模块 L：四分法鼻眼症状评分

使用 `SymptomScoreCard` 组件。6 个症状，每个用 `Radio.Group` 展示 0-3 分的选项。

**关键 UI 设计**：每个评分选项不是简单的 0/1/2/3 数字，而是要展示完整的文字描述（CRF 中的描述），用卡片式 Radio 展示：

```
喷嚏评分：
┌──────────┐ ┌──────────────────────┐ ┌──────────────────┐ ┌───────────────────┐
│ ○ 0分    │ │ ○ 1分               │ │ ○ 2分            │ │ ○ 3分             │
│ 无       │ │ 每日3-5次            │ │ 每日6-10次        │ │ 每日≥11次          │
└──────────┘ └──────────────────────┘ └──────────────────┘ └───────────────────┘
```

底部自动计算：鼻部症状总分（前4项）和鼻眼症状总分（全6项）

每个症状的具体文字描述严格参照 CRF 原文：

**喷嚏**：0=无 / 1=每日3-5次 / 2=每日6-10次 / 3=每日≥11次
**流涕**：0=无 / 1=少量分泌物，仅前鼻孔可见，无需擦拭 / 2=分泌物中等，超过前鼻孔，需间断擦拭 / 3=分泌物大量，沿鼻唇沟下流，需持续擦拭
**鼻痒**：0=无 / 1=间断性鼻痒，可忍受 / 2=鼻痒明显，令人厌烦但可忍受 / 3=鼻痒难以忍受，影响日常生活
**鼻塞**：0=无 / 1=有意识吸气时感觉鼻塞，无张口呼吸 / 2=间歇性或交替性鼻塞，伴张口呼吸 / 3=几乎全天张口呼吸
**眼痒/异物感/眼红**：0=无 / 1=间断性，可忍受 / 2=症状明显，令人厌烦但可忍受 / 3=难以忍受，影响日常生活
**流泪**：0=无 / 1=间断性，可忍受 / 2=症状明显，令人厌烦但可忍受 / 3=难以忍受，影响日常生活

#### 模块 M：RQLQ 问卷

使用 `RQLQForm` 组件。28 个问题分 7 个维度。

每个问题用 `Rate` 或 `Radio.Group`（0-6 分），分维度折叠展示。

维度和问题编号：

- 活动受限 Q1-Q3
- 睡眠 Q4-Q6
- 非鼻/眼症状 Q7-Q13
- 实际问题 Q14-Q16
- 鼻部症状 Q17-Q20
- 眼部症状 Q21-Q24
- 情绪 Q25-Q28

**问题文字严格参照 CRF 原文（第10-11页）**。

每个维度显示小计，底部显示 RQLQ 总分。

#### 模块 N：中医证候评分

使用 `TCMScoreForm` 组件。

主症 4 项（0/2/4/6分制），次症 5 项（0/1/2/3分制）。每项用卡片式 Radio，带完整文字描述。

末尾两个自由文本框：舌象描述、脉象描述。

底部自动计算中医证候积分。

#### 模块 O：入选标准

6 个问题，每个用 Radio（是/否）。

**联动逻辑**：全部选"是"时，下方自动显示绿色提示"符合入选标准"；任一选"否"，显示红色提示"不符合入选标准"。

入选标准问题文字严格参照 CRF 第12页：

1. 确诊为过敏性鼻炎患者，病程≥2年
2. 符合中医鼻鼽风寒犯鼻证
3. 年龄 18-60 岁，性别不限
4. 过敏原SPT和/或血清特异性IgE阳性，或鼻激发试验阳性
5. 至少有一个主要鼻部症状在中度以上（四分法评分≥2分）
6. 符合GCP规定，签署知情同意书，自愿受试

#### 模块 P：排除标准

11 个问题，每个用 Radio（是/否）。

**联动逻辑**：全部选"否"时，显示绿色提示"未触及排除标准"；任一选"是"，显示红色警告。

排除标准问题文字严格参照 CRF 第13页。

#### 模块 Q：基线判定

根据入选/排除标准的勾选结果自动判定：

- 全部满足 → 显示"最终筛选成功"
- 不满足 → 显示"最终筛选失败"+ 原因输入框

#### 模块 R：发放研究药物

| 字段         | 组件                      |
| ------------ | ------------------------- |
| 研究药物支数 | InputNumber               |
| 负责医师签字 | Input（Demo阶段文本输入） |
| 签字日期     | DatePicker                |

---

### 5.5 V2 治疗期 D7 表单

模块组成（按顺序）：

1. **访视日期** — DatePicker
2. **生命体征** — 复用 `VitalSignsForm`
3. **上次访视后情况** — 两个 Radio（是否不良事件/是否合并用药变化）
4. **VAS 评分** — 复用 `VASSlider`
5. **四分法症状评分** — 复用 `SymptomScoreCard`
6. **RQLQ 问卷** — 复用 `RQLQForm`
7. **中医证候评分** — 复用 `TCMScoreForm`
8. **药物评分** — 使用 `MedScoreForm`
9. **药物回收与发放** — 使用 `DrugRecoveryForm`
10. **疗效评估** — 使用 `EfficacyForm`

### 5.6 V3 治疗期 D14 表单

在 V2 基础上**增加**：

- 实验室检查（血常规 + 尿常规 + 血生化）— 复用 `LabResultsForm`

其余模块与 V2 一致。

### 5.7 V4 治疗期 D28 表单

在 V3 基础上**增加**：

- FeNO 检测（口+鼻）
- 血清总 IgE 监测
- 心电图检查

其余模块与 V3 一致。

### 5.8 V5 随访期 M2 表单

模块组成（精简版）：

1. 访视日期
2. 生命体征
3. VAS 评分
4. 四分法症状评分
5. RQLQ 问卷
6. 中医证候评分
7. 药物评分
8. 疗效评估

**无**实验室检查、药物回收、不良事件/合并用药勾选。

### 5.9 V6 随访期 M3 表单

与 V5 完全一致。

### 5.10 不良事件页

**布局**：顶部"新增不良事件"按钮 + 下方表格

**表格列**：编号、事件名称、开始日期、结束日期、严重程度、与研究药物关系、转归、是否SAE、操作（编辑/删除）

**新增/编辑弹窗**：Modal 中的表单，字段参照 `AdverseEvent` 类型。

严重程度选项（Radio）：

- 1级（轻度）— 附说明文字
- 2级（中度）
- 3级（重度）

与研究药物关系选项（Radio）：1=肯定有关 / 2=很可能有关 / 3=可能有关 / 4=可能无关 / 5=无关

AE转归选项（Radio）：1=无变化 / 2=病情恶化 / 3=恢复治愈 / 4=改善中 / 5=留有后遗症 / 6=死亡

SAE类型选项（仅 isSAE=true 时展示）：7选1

### 5.11 合并用药页

**布局**：顶部"新增合并用药"按钮 + 下方表格

表格列参照 `ConcomitantMed` 类型。新增/编辑用 Modal。

### 5.12 合并非药物治疗页

**布局**：与合并用药页类似。

表格列参照 `NonDrugTherapy` 类型。

### 5.13 完成情况总结页

参照 CRF 第41页，字段包括：

| 字段             | 组件                   | 说明                  |
| ---------------- | ---------------------- | --------------------- |
| 是否完成28天治疗 | Radio(是/否)           |                       |
| 研究完成日期     | DatePicker             | 选"是"时展示          |
| 末次给药日期     | DatePicker             | 选"否"时展示          |
| 是否进行末次访视 | Radio                  | 选"否"时展示          |
| 未进行原因       | Input                  |                       |
| 退出原因         | Radio（9个选项，单选） | 选项文字参照 CRF 原文 |
| 对应AE编号       | InputNumber            | 因AE退出时展示        |
| 死亡日期         | DatePicker             | 选"死亡"时展示        |
| 死亡原因         | Input                  |                       |

### 5.14 数据导出页 `/export`

**页面布局**：

**筛选区域**：

- 研究中心：下拉多选
- 患者状态：下拉多选
- 入组日期范围：RangePicker
- "查询"按钮

**预览表格**：显示符合条件的患者列表（简要信息）

**导出按钮**：

- `导出全量数据 (.xlsx)` — 导出所有访视的所有字段
- `导出安全性数据 (.xlsx)` — 只导出不良事件和合并用药

**导出逻辑**（在 `utils/exportExcel.ts` 中实现）：

使用 SheetJS (`xlsx` 库) 在前端直接生成 Excel 文件。

工作簿结构：

- Sheet 1 "主数据表"：每行一个患者，列按 `基本信息 → V1全字段 → V2全字段 → ... → V6全字段` 展开
- Sheet 2 "不良事件"：每行一个事件记录，含患者筛选号
- Sheet 3 "合并用药"：每行一条用药记录
- Sheet 4 "合并非药物治疗"：每行一条治疗记录

列名命名规则：`{访视}_{模块}_{字段}`，例如：

- `V1_人口学_性别`
- `V2_VAS_喷嚏`
- `V3_血常规_WBC值`
- `V4_中医证候_鼻痒`

---

## 6. 可复用组件规格

### 6.1 `FormSection`

折叠面板容器，用 Ant Design `Collapse.Panel` 封装。

**Props**：

- `title: string` — 模块标题
- `icon?: ReactNode` — 标题前的图标
- `required?: boolean` — 是否必填模块（显示红色星号）
- `status?: 'complete' | 'partial' | 'empty'` — 右侧状态指示
- `children: ReactNode`

### 6.2 `VASSlider`

**Props**：

- `value: VASScores`
- `onChange: (scores: VASScores) => void`
- `disabled?: boolean`

**内部实现**：

- 6 个 `Slider`，range 0-10，step 1
- 每个 Slider 左侧标签，右侧显示当前值 + 严重程度（1-3轻度, 4-7中度, 8-10重度），用 Tag 组件配色
- 底部显示 VAS 总分（自动求和），用 Statistic 组件

### 6.3 `SymptomScoreCard`

**Props**：

- `value: SymptomFourScale`
- `onChange: (scores: SymptomFourScale) => void`
- `disabled?: boolean`

**内部实现**：

- 6 个症状区块
- 每个区块标题 + 4 个卡片式 Radio（0-3分），卡片内含分值和文字描述
- 被选中的卡片有蓝色边框高亮
- 底部双总分：鼻部症状总分（前4项）+ 鼻眼症状总分（全6项）

### 6.4 `RQLQForm`

**Props**：

- `value: RQLQScores`
- `onChange: (scores: RQLQScores) => void`
- `disabled?: boolean`

**内部实现**：

- 7 个维度折叠面板
- 每个维度内包含若干问题，每题一个 0-6 的 Radio.Group（横向排列）
- 维度小计和 RQLQ 总分自动计算

### 6.5 `TCMScoreForm`

**Props**：

- `value: TCMScores`
- `onChange: (scores: TCMScores) => void`
- `disabled?: boolean`

**内部实现**：

- 主症区域：4 项，每项 Radio 卡片（0/2/4/6）
- 次症区域：5 项，每项 Radio 卡片（0/1/2/3）
- 舌象/脉象文本输入框
- 底部中医证候积分（自动求和）

### 6.6 `MedScoreForm`

**Props**：

- `value: MedScore`
- `onChange: (score: MedScore) => void`

**内部实现**：

- 5 种用药类型，每种一行：Checkbox（是否使用）+ InputNumber（用药天数）+ 自动计算总分
- 底部总分

### 6.7 `VitalSignsForm`

复用于所有 6 个访视。5 个 InputNumber 字段横向排列。

### 6.8 `LabResultsForm`

复用于 V1, V3, V4。接收一个 `modules` prop 控制显示哪些子模块：

```typescript
interface LabResultsFormProps {
  modules: Array<'blood' | 'urine' | 'biochem' | 'feno' | 'ecg' | 'ige'>;
  // ...
}
```

### 6.9 `EfficacyForm`

**Props**：

- `baselineScore: number` — 治疗前积分（从 V1 中医证候总分获取）
- `currentScore: number` — 当前积分
- `value: EfficacyAssessment`
- `onChange: (assessment: EfficacyAssessment) => void`

**内部实现**：

- 疗效指数自动计算并显示：`(baselineScore - currentScore) / baselineScore * 100%`
- 疗效评价自动判定并高亮：≥90%临床控制 / 70-89%显效 / 30-69%有效 / <30%无效
- 症状缓解情况 Radio
- 转重/并发症评估 Radio

### 6.10 `DrugRecoveryForm`

**内部实现**：

- 回收支数 + 应服支数 → 自动计算依从性百分比
- 依从性 < 80% 或 > 120% 时红色警告"需退出试验"
- 发放支数

---

## 7. 自动计算逻辑 (`utils/scoring.ts`)

以下计算全部在前端实时完成：

```typescript
// BMI = 体重(kg) / (身高(m))^2
export function calcBMI(weight: number, height: number): number;

// VAS 总分 = 6 项之和
export function calcVASTotal(scores: Omit<VASScores, 'total'>): number;

// 四分法鼻部总分 = 前 4 项之和
export function calcNasalTotal(scores: SymptomFourScale): number;

// 四分法鼻眼总分 = 全 6 项之和
export function calcSymptomTotal(scores: SymptomFourScale): number;

// RQLQ 总分 = 28 项之和
export function calcRQLQTotal(scores: Omit<RQLQScores, 'total'>): number;

// 中医证候积分 = 主症 4 项 + 次症 5 项之和
export function calcTCMTotal(scores: Omit<TCMScores, 'total' | 'tongueDesc' | 'pulseDesc'>): number;

// 药物评分总分 = 各类型的 (每日计分 × 用药天数) 之和
export function calcMedScoreTotal(score: MedScore): number;

// 依从性 = (应服 - 剩余) / 应服 × 100%
export function calcCompliance(expected: number, returned: number): number;

// 疗效指数 = (治疗前积分 - 治疗后积分) / 治疗前积分 × 100%
export function calcEfficacyIndex(baseline: number, current: number): number;

// 疗效等级判定
export function getEfficacyLevel(index: number): '临床控制' | '显效' | '有效' | '无效';
```

---

## 8. 表单校验规则 (`utils/validators.ts`)

### 通用规则

- 所有必填项为空时提示"请填写此项"
- 日期字段不能晚于今天
- 数值字段不能为负数

### V1 特有校验

- 年龄必须 18-60 岁
- BMI 自动计算，不可手动输入
- 入选标准 6 项全部为"是"才能通过
- 排除标准 11 项全部为"否"才能通过
- 筛选号前两位必须与当前中心编号一致

### V2-V4 校验

- 依从性 < 80% 或 > 120% 时弹出确认弹窗（需退出试验）
- 疗效指数自动判定，不可手动修改疗效等级

### 不良事件校验

- 若 isSAE = true，SAE 类型必填
- 结束日期不能早于开始日期

---

## 9. Mock 数据 (`mock/patients.ts`)

预置 6 个患者，覆盖不同状态：

| 筛选号 | 随机编号 | 中心 | 状态      | 说明                    |
| ------ | -------- | ---- | --------- | ----------------------- |
| 01001  | 001      | 01   | completed | 完整数据，V1-V6全部提交 |
| 01002  | 002      | 01   | treatment | V1-V2已提交，V3草稿     |
| 02001  | 003      | 02   | followup  | V1-V4已提交，V5草稿     |
| 03001  | —       | 03   | screening | 仅V1草稿，筛选失败      |
| 03002  | 004      | 03   | withdrawn | 因AE退出                |
| 04001  | 005      | 04   | treatment | V1-V3已提交，有2个AE    |

每个患者的数据应填充合理的数值（体温36.5℃、血压正常范围内、VAS评分4-7分中度等），使 Demo 看起来真实。

---

## 10. 状态管理 (`store/PatientContext.tsx`)

使用 React Context + useReducer 管理全局状态：

```typescript
interface AppState {
  currentUser: { username: string; centerId: string; role: string; };
  patients: Patient[];
  loading: boolean;
}

type Action =
  | { type: 'LOGIN'; payload: { username: string; centerId: string } }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'UPDATE_VISIT'; payload: { patientId: string; visitNo: string; data: Partial<VisitData> } }
  | { type: 'ADD_ADVERSE_EVENT'; payload: { patientId: string; event: AdverseEvent } }
  | { type: 'UPDATE_ADVERSE_EVENT'; payload: { patientId: string; eventId: string; event: AdverseEvent } }
  | { type: 'DELETE_ADVERSE_EVENT'; payload: { patientId: string; eventId: string } }
  | { type: 'ADD_CONCOMITANT_MED'; payload: { patientId: string; med: ConcomitantMed } }
  // ... 同理其他 action
```

所有数据存储在内存中（Demo 阶段），可选加 localStorage 持久化防刷新丢失。

---

## 11. 开发阶段建议

### Phase 1：骨架与路由（约 2-3 小时）

- 项目初始化、依赖安装
- 全局布局（Layout + Sider + Header）
- 路由配置
- 登录页
- PatientContext 搭建
- Mock 数据加载

### Phase 2：患者列表页（约 1-2 小时）

- 患者列表 Table
- 搜索和筛选功能
- 新建患者 Modal
- 状态 Tag 组件

### Phase 3：可复用评分组件（约 3-4 小时）

- VASSlider
- SymptomScoreCard（含完整文字描述）
- RQLQForm
- TCMScoreForm
- MedScoreForm
- VitalSignsForm
- LabResultsForm
- EfficacyForm
- DrugRecoveryForm
- FormSection

### Phase 4：V1 筛查期表单（约 4-5 小时）

- 最复杂的表单，17 个模块
- 入选/排除标准联动逻辑
- 基线判定自动化

### Phase 5：V2-V6 表单（约 3-4 小时）

- 大量复用 Phase 3 的组件
- 按各访视的模块差异组装
- 疗效指数/依从性自动计算

### Phase 6：不良事件/合并用药/完成总结（约 2-3 小时）

- 三个独立的 CRUD 页面
- Modal 表单编辑
- 完成情况总结表单

### Phase 7：数据导出（约 2-3 小时）

- 筛选面板
- Excel 导出逻辑（列展开、多 Sheet）
- 下载功能

### Phase 8：联调与打磨（约 2-3 小时）

- 全流程走通测试
- 自动计算校验
- UI 细节优化
- 响应式适配

**总预估工时：约 20-27 小时**

---

## 12. 注意事项

1. **CRF 字段保真度**：所有评分项的文字描述、选项内容必须严格参照 CRF 原文（本文档附带的 PDF），不得自行简化或修改，这是临床研究的合规要求。
2. **中文界面**：所有 UI 文字使用中文，包括按钮、提示、表头。Ant Design 设置 `zh_CN` locale。
3. **打印友好**：虽然是 Demo，但建议表单区域的 CSS 支持 `@media print`，方便后续加打印功能。
4. **无后端**：Demo 阶段所有数据存储在前端内存/localStorage 中，不需要搭建后端服务。API 层的接口定义可以预留（TypeScript interface），待正式开发时对接。
5. **CRF PDF 文件**：开发时请参照项目中的 `荆防合剂CRF2.pdf` 文件，确保所有字段和选项与纸质 CRF 完全一致。
