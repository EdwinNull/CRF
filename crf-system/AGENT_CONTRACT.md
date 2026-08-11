# 子 Agent 开发契约

## 项目
`/Users/edwinnull/Projects/CRF/crf-system` — React18 + TS + antd5，Vite。
UI 全中文。严格参照 `/Users/edwinnull/Projects/CRF/plan.md`。

## 已就绪的地基（只读，勿改）
- types: `src/types/*`（含 barrel `index.ts`）
- 字典: `src/mock/dictionaries.ts`（评分描述/选项/AE 映射/CENTER_NAME）
- 评分工具: `src/utils/scoring.ts`（calcBMI/calcVASTotal/calcNasalTotal/calcSymptomTotal/calcRQLQTotal/calcTCMTotal/calcCompliance/calcEfficacyIndex/getEfficacyLevel/vasSeverity/drugTypeTotal）
- 校验: `src/utils/validators.ts`
- store: `src/store/PatientContext.tsx`（usePatientStore -> { state, dispatch }）
- 布局: `src/layout/AppLayout.tsx`
- 组件契约: `src/components/componentTypes.ts`（所有表单控件的 Props）
- FormSection: `src/components/FormSection.tsx`

## 组件受控约定
所有评分控件对外表现 `{ value?, onChange?, disabled? }`（见 componentTypes.ts 的 ControlProps）。
在 `<Form.Item name=...>` 中直接放置 `<VASSlider />`，AntD 自动注入 value/onChange。
控件内部必须自行用 scoring.ts 计算并反映派生 total 字段，且 **onChange 时回传含 total 的完整对象**。

## 校验规则已存在，直接在 Form 的 rules 中引用 validate 函数即可。

## 页面写法要点
- 每个页面通过 `useRate`/`useParams` 读当前患者，`usePatientStore()` 拿 dispatch。
- 底部「暂存」=dispatch UPDATE_VISIT(close status 'draft')；「提交」=校验通过后 'submitted'。
- 复用组件/表单，不在页面重复实现评分 UI。

## 技术注意
- 不要运行项目级 `npx tsc --noEmit`（App.tsx 引用了尚未创建的页面，全量检查会红；由主流程统一集成）。
- 只把你负责的文件写正确、自洽。
- 文件全部独立，agent 之间互不覆盖（每个 agent 认领固定文件集合）。
