# 0002: Decision Record Process

Status: Accepted
Date: 2026-06-02

## Context

Strike5 后续会开始写代码。实现过程中会不断遇到选择：

- 使用什么前端构建工具。
- 使用什么样式方案。
- K-line provider 选哪一个。
- PredictManager 怎么查找。
- quote 走 Predict Server 还是 devInspect。
- deposit 和 mint 是否合并。
- opening cutoff 设多少秒。

如果这些选择只停留在聊天里，后续很容易丢失上下文。

## Decision

Strike5 使用 `docs/decisions/` 保存重要产品和技术决策。

规则：

1. 每个重要决策写一个 markdown 文件。
2. 文件名使用递增编号。
3. 旧决策不删除，只标记 Superseded。
4. 每条记录至少包含 Context、Decision、Rationale、Consequences。
5. 写代码前，如果选择会影响架构、协议接入、依赖、数据源、交易流程或 MVP 范围，必须先记录或更新 decision record。

## Rationale

这样可以保证：

- 项目逻辑持续一致。
- 技术选择有来源。
- 后续 debug 或重构时知道原始原因。
- Demo 和答辩时能解释为什么这么做。
- 多人协作时减少口头信息丢失。

## Consequences

正面影响：

- 决策可追踪。
- 文档和代码更容易保持一致。
- 可以更快发现范围扩散。

成本：

- 每次重要选择前需要多写一小段文档。
- 需要维护 Superseded 状态。

## Alternatives Considered

### 只写 README

未采用。README 会变得过长，而且不适合记录历史决策。

### 只在聊天里记录

未采用。聊天上下文不稳定，后续查找困难。

### 完整企业级 ADR 流程

未采用。太重，不适合黑客松节奏。

## Revisit When

如果项目进入多人长期维护，可以升级为更严格的 ADR 流程，包括 reviewer、owner 和 changelog。
