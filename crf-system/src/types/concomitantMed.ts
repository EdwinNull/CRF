/**
 * 合并用药 / 合并非药物治疗 / 完成情况 类型定义
 * 对应 plan.md §3.4
 */

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

/** 退出原因选项码（数字），展示文本在 dictionaries 中 */
export type WithdrawalReasonCode =
  | 1 // 受试者主动退出
  | 2 // 研究者因安全性终止
  | 3 // 依从性差
  | 4 // 失访
  | 5 // 不良事件
  | 6 // 妊娠
  | 7 // 发生死亡
  | 8 // 研究者认为不适合继续
  | 9; // 其他

export interface CompletionSummary {
  completedTreatment: boolean; // 是否完成28天治疗
  completionDate?: string;
  lastDoseDate?: string;
  hadFinalVisit?: boolean; // 是否进行末次访视
  noFinalVisitReason?: string;
  withdrawalReason?: WithdrawalReasonCode;
  withdrawalDetail?: string;
  aeSeqNo?: number;
  deathDate?: string;
  deathCause?: string;
}
