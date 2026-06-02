# Strike5 Engineering Workflow

本文档定义 Strike5 后续写代码时的工作流程，重点是保持实现、文档和决策记录一致。

## 1. 每轮开发流程

每次开始一个功能前，按下面顺序执行：

```text
1. 确认目标
2. 检查相关文档
3. 判断是否需要新增或更新 decision record
4. 实现代码
5. 运行验证
6. 总结变更和风险
```

## 2. 什么时候必须写 Decision Record

以下情况必须写入 `docs/decisions/`：

- 选择新的依赖。
- 改变前端框架、构建工具、样式方案。
- 改变 DeepBook Predict 接入方式。
- 改变 Sui RPC / Predict Server 的状态来源边界。
- 选择 K-line provider。
- 改变 quote / mint / redeem 交易流程。
- 改变 5-minute round / 15-minute settlement 的产品语义。
- 改变 opening cutoff。
- 改变 Quick Picks 生成策略。
- 改变 portfolio / position 数据来源。
- 新增 MVP 之外的大功能。

小的 UI 文案、样式微调、局部 bugfix 不需要单独写 decision record，但如果影响项目主线，仍然要记录。

## 3. 实现前检查清单

开发前确认：

- 当前需求是否在 MVP 范围内。
- 是否符合 `docs/product/product-spec.md`。
- 是否符合 `docs/technical/architecture.md`。
- 是否符合 `docs/technical/deepbook-integration.md`。
- 是否需要新增 ADR。
- 是否会改变 demo 讲法。

## 4. 验证要求

按功能风险选择验证方式。

基础验证：

- TypeScript typecheck。
- Lint / format, if configured。
- 本地 dev server 启动。
- 浏览器页面无明显错误。

DeepBook / Sui 相关验证：

- RPC read 成功。
- Predict Server fetch 成功。
- devInspect quote 成功。
- transaction effects 可读取。
- manager / position 状态可刷新。

前端体验验证：

- desktop viewport。
- mobile-ish narrow viewport。
- Chart 不空白。
- 按钮文案不溢出。
- loading / error / empty state 可见。

## 5. 文档同步规则

如果实现改变了项目事实，需要同步文档。

例子：

- 如果 K-line provider 最终不是原计划，要更新 architecture / decision。
- 如果 quote 不走 Predict Server，只走 devInspect，要更新 DeepBook integration。
- 如果 deposit 和 mint 合并成一个 PTB，要更新 transaction flow。
- 如果 opening cutoff 从 60 秒改成 90 秒，要更新 product spec 和 decision。

## 6. 提交前检查

每次提交前至少确认：

```text
git status
typecheck / lint / relevant tests
manual browser check if UI changed
docs updated if decision changed
```

提交信息建议包含功能范围：

```text
docs: add implementation roadmap
feat: scaffold strike5 frontend
feat: add predict server oracle client
feat: add wallet and manager loading
```

## 7. 当前代码实现顺序

推荐顺序：

1. App scaffold。
2. Config layer。
3. Predict Server client。
4. Sui RPC client。
5. Chart and Market Pulse。
6. Wallet connect。
7. PredictManager discovery / creation。
8. Trade Panel。
9. Quote preview。
10. Mint transactions。
11. Positions。
12. Redeem。
13. Vault Health。
14. Demo hardening。
