/**
 * 可复用评分组件的统一约定 (plan.md §6)
 *
 * 所有表单控件组件采用 AntD 受控模式：对外暴露 value/onChange。
 * 在 AntD Form.Item 中可直接作为 <Component /> 使用（Form 自动注入 value/onChange 并校验）。
 */
import type {
  VASScores,
  SymptomFourScale,
  RQLQScores,
  TCMScores,
  MedScore,
  VitalSigns,
} from '../types/visit';

/** 通用外形：受控 value + onChange */
export interface ControlProps<T> {
  value?: T;
  onChange?: (value: T) => void;
  disabled?: boolean;
}

export interface VASSliderProps extends ControlProps<VASScores> {}

export interface SymptomScoreCardProps extends ControlProps<SymptomFourScale> {}

export interface RQLQFormProps extends ControlProps<RQLQScores> {}

export interface TCMScoreFormProps extends ControlProps<TCMScores> {}

export interface MedScoreFormProps extends ControlProps<MedScore> {}

export interface VitalSignsFormProps extends ControlProps<VitalSigns> {}

import type { LabBloodRoutine, LabUrinalysis, LabBiochemistry, FeNO, ECG, SerumIgE } from '../types/visit';

export type LabModule = 'blood' | 'urine' | 'biochem' | 'feno' | 'ecg' | 'ige';

export interface LabResultsFormProps extends ControlProps<{
  labBlood?: LabBloodRoutine;
  labUrine?: LabUrinalysis;
  labBiochem?: LabBiochemistry;
  feno?: FeNO;
  ecg?: ECG;
  serumIgE?: SerumIgE;
}> {
  modules: LabModule[];
}

import type { EfficacyAssessment, DrugRecovery } from '../types/visit';

export interface EfficacyFormProps extends ControlProps<EfficacyAssessment> {
  /** 治疗前积分（V1 中医证候总分） */
  baselineScore: number;
  /** 当前积分（本访视中医证候总分） */
  currentScore: number;
}

export interface DrugRecoveryFormProps extends ControlProps<DrugRecovery> {}
