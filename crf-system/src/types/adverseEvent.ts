/**
 * 不良事件 (Adverse Event) 类型定义
 * 对应 plan.md §3.3 与 CRF 不良事件页。
 * 各项 option 值均采用数字码，展示文本在 mock/dictionaries.ts 中映射。
 */

export interface AdverseEvent {
  id: string;
  seqNo: number; // 编号 1,2,3...
  eventName: string;
  description: string;
  startDate: string;
  isOngoing: boolean;
  endDate?: string;
  severity: 1 | 2 | 3; // 1=轻度 2=中度 3=重度
  drugMeasure: 1 | 2 | 3 | 4 | 5; // 维持/退出/减量/增量/中断
  otherMeasure: 1 | 2 | 3 | 4; // 无/住院/合并用药/合并非药物
  otherMeasureDetail?: string;
  drugRelation: 1 | 2 | 3 | 4 | 5; // 肯定有关~无关
  outcome: 1 | 2 | 3 | 4 | 5 | 6; // 无变化~死亡
  isSAE: boolean;
  saeType?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
