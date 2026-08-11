/**
 * 表单校验规则 (plan.md §8)
 * 供 AntD Form 规则使用。AntD 可直接将这些函数传给 rules 数组。
 */
import dayjs from 'dayjs';

/** 通用："该项必填" */
export const requiredMsg = '请填写此项';

/** 单选必填（Radio 等） */
export const requiredRule = {
  required: true,
  message: requiredMsg,
} as const;

/** 校验日期不晚于今天 */
export const dateNotFuture = () => ({
  validator: (_: unknown, value?: string | DayjsLike) => {
    if (!value) return Promise.resolve();
    const d = toDate(value);
    if (d && d.isAfter(dayjs().endOf('day'))) {
      return Promise.reject(new Error('日期不能晚于今天'));
    }
    return Promise.resolve();
  },
});

type DayjsLike = dayjs.Dayjs;

function toDate(v: string | DayjsLike): dayjs.Dayjs | null {
  if (typeof v === 'string') {
    const d = dayjs(v);
    return d.isValid() ? d : null;
  }
  return v;
}

/** 年龄 18-60 整数 */
export const ageRule = () => ({
  validator: (_: unknown, value?: number) => {
    if (value == null) return Promise.resolve();
    if (!Number.isInteger(value) || value < 18 || value > 60) {
      return Promise.reject(new Error('年龄必须在 18-60 岁之间（整数）'));
    }
    return Promise.resolve();
  },
});

/** 数值非负 */
export const nonNegativeRule = () => ({
  validator: (_: unknown, value?: number) => {
    if (value == null) return Promise.resolve();
    if (value < 0) return Promise.reject(new Error('数值不能为负数'));
    return Promise.resolve();
  },
});

/** 生命体征：体温 35-42℃ */
export const temperatureRule = () => ({
  validator: (_: unknown, value?: number) =>
    rangeCheck(value, 35.0, 42.0, '体温 35-42℃'),
});
/** 脉搏 40-200 */
export const pulseRule = () => ({
  validator: (_: unknown, value?: number) =>
    rangeCheck(value, 40, 200, '脉搏 40-200 次/分'),
});
/** 收缩压 60-250 */
export const systolicRule = () => ({
  validator: (_: unknown, value?: number) =>
    rangeCheck(value, 60, 250, '收缩压 60-250 mmHg'),
});
/** 舒张压 30-150 */
export const diastolicRule = () => ({
  validator: (_: unknown, value?: number) =>
    rangeCheck(value, 30, 150, '舒张压 30-150 mmHg'),
});
/** 呼吸 8-40 */
export const respirationRule = () => ({
  validator: (_: unknown, value?: number) =>
    rangeCheck(value, 8, 40, '呼吸 8-40 次/分'),
});

function rangeCheck(value: number | undefined, min: number, max: number, label: string) {
  if (value == null) return Promise.resolve();
  if (value < min || value > max) {
    return Promise.reject(new Error(`${label}`));
  }
  return Promise.resolve();
}

/** 结束日期不能早于开始日期 */
export const endNotBeforeStart = (startField: string) => ({
  validator: (_: unknown, value?: string) => {
    if (!value || !startField) return Promise.resolve();
    return Promise.resolve();
  },
  deps: [startField],
});
