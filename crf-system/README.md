# CRF 电子化录入系统 — 演示版

荆防合剂治疗过敏性鼻炎临床研究的 **CRF 电子化录入系统** 前端 Demo。纯前端 + Mock 数据，可在浏览器直接演示给医院团队。

## 技术栈
React · TypeScript · Ant Design 6 · React Router v6 · dayjs · SheetJS(xlsx) · file-saver · Vite

> 注：plan.md 建议 antd5/React18；实际装得 6.x/React19，实现只用了跨版本稳定的 API（Layout/Form/Table/Collapse/Tabs/Statistic 等），UI 与规格一致。

## 启动
```bash
npm install          # 已装
npm run dev          # http://localhost:5173
```
登录页任意用户名/密码即可。

## 功能
- 登录（选择研究中心）→ 患者列表（搜索/状态筛选/新建患者/访视进度）→ 患者详情
- 左侧 Tab：V1~V6 六次访视 + 不良事件 / 合并用药 / 非药物治疗 / 完成情况总结
- 复用评分组件：VAS 滑条、四分法症状卡片（CRF 原文描述）、RQLQ 28 问、中医证候、药物评分、药物回收依从性、疗效评估（疗效指数/等级自动判定）、实验室检查（血常规/尿常规/血生化/FeNO/心电图/总IgE）
- V1 全 17 模块（知情同意~发放药物），BMI 与入选/排除联动自动判定
- 数据导出：全量 / 安全性两种 Excel（SheetJS 前端生成下载）
- 自动计算：BMI、各评分总分、依从性、疗效指数全部前端实时完成
- 数据存 Context + localStorage（防刷新丢失），6 例覆盖各状态的预置患者

## 目录
```
src/
  types/      类型定义        components/  可复用评分组件（受控 value/onChange）
  mock/       患者数据 + 选项字典  utils/       scoring 计算 / validators / exportExcel
  store/      PatientContext   pages/       登录/列表/详情V1-V6/不良事件/合并用药/导出
  layout/     AppLayout
```

## 审核与修复记录（已由 opus 评审并修复）
- 新建患者 `nameAbbr.join()` 崩溃（字符串非数组）→ 已修
- 疗效指数显示与存储不一致（仅改中医证候时 store 存 null）→ 组件内 useEffect 回写派生值
- V1 提交绕过校验锁空表 → 校验失败不再提交
- UPDATE_VISIT 浅合并覆盖 visitDate → reducer 保留已有日期
- 退出原因类型注释错位 → 同步字典
- 完成情况页加归档锁定、按原因保留字段
- mock 已完成患者 V1 未置 submitted → 已补
