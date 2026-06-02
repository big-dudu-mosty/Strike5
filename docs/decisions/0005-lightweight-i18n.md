# 0005: Lightweight Internationalization

Status: Accepted
Date: 2026-06-02

## Context

Strike5 MVP 需要支持中英切换。当前项目还处于前端基础阶段，页面文案集中在少量组件里。

我们需要让用户和评委可以在中文与英文之间切换，同时避免在 MVP 早期引入过重的 i18n 框架。

## Decision

Strike5 MVP 使用轻量本地 i18n 实现：

```text
src/lib/i18n/
  I18nProvider.tsx
  messages.ts
  types.ts
```

功能：

- 支持 `en` 和 `zh`。
- 默认语言为英文。
- 用户选择保存到 `localStorage`。
- 当前自定义 UI 文案接入字典。
- 第三方钱包按钮文案暂不强制翻译。

## Rationale

这个方案适合当前阶段：

- 不引入新依赖。
- 实现简单，便于维护。
- 可以覆盖当前页面自定义文案。
- 后续如果文案规模扩大，可以迁移到专业 i18n library。

## Consequences

正面影响：

- 评委和中文团队成员都能更容易理解页面。
- 不影响当前 DeepBook Predict 数据接入。
- 保持 bundle 和依赖简单。

限制：

- 不支持复杂复数规则。
- 不支持自动提取翻译 key。
- 第三方组件内部文案不一定能翻译。

## Alternatives Considered

### i18next

暂不采用。功能完整但对当前 MVP 偏重。

### react-intl

暂不采用。当前没有复杂国际化格式需求。

### 只写中文或只写英文

未采用。项目需要兼顾中文讨论和英文 demo/pitch。

## Revisit When

以下情况需要重新评估：

- 页面文案显著增加。
- 需要更多语言。
- 需要复杂日期、货币、复数和插值规则。
- 需要翻译第三方组件或钱包连接按钮。
