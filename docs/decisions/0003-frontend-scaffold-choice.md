# 0003: Frontend Scaffold Choice

Status: Accepted
Date: 2026-06-02

## Context

Strike5 现在进入代码实现阶段。MVP 需要一个可快速开发、易于接入 Sui wallet、DeepBook Predict API、K-line chart 和交易 PTB 的前端工程。

官方 Sui dApp Kit React 文档当前推荐 React 应用使用：

```text
@mysten/dapp-kit-react
@mysten/sui
```

并且 create-dapp 默认生成 React + TypeScript + Vite + Tailwind CSS v4 项目。

## Decision

Strike5 前端 scaffold 使用：

```text
Vite
React
TypeScript
pnpm
Tailwind CSS v4
@mysten/dapp-kit-react
@mysten/sui
@tanstack/react-query
lightweight-charts
lucide-react
```

项目先采用纯前端 dApp。只有当 BTC K-line provider 出现 CORS、rate limit 或 API key 问题时，再增加轻量后端代理。

## Rationale

这个组合适合当前 MVP：

- Vite + React + TypeScript 启动快，适合黑客松。
- `@mysten/dapp-kit-react` 是当前新 dApp Kit React binding。
- `@mysten/sui` 用于 Sui client、PTB、devInspect 和 transaction。
- TanStack Query 适合管理 Predict Server、oracle、vault、portfolio 和 quote 数据。
- lightweight-charts 适合实现 BTC K-line。
- Tailwind CSS v4 可以快速完成交易终端 UI。
- lucide-react 提供清晰的按钮和状态图标。

## Consequences

正面影响：

- 能快速进入页面和 wallet 功能。
- 与官方 Sui dApp Kit 当前推荐方向一致。
- 后续可自然接入 PTB、wallet signing 和 RPC state reads。

限制：

- 新 dApp Kit 与旧 `@mysten/dapp-kit` API 不同，不能照搬旧 hook 用法。
- Tailwind v4 配置方式和 v3 不同，需要使用 `@tailwindcss/vite`。
- 当前阶段不引入复杂 UI library，部分组件需要自己写。

## Alternatives Considered

### Next.js

未采用。MVP 不需要 SSR，且 wallet UI 需要 client-only 处理，Vite 更轻。

### Legacy `@mysten/dapp-kit`

未采用。官方文档说明 legacy package 只支持 deprecated JSON RPC，不建议新项目使用。

### Chakra / MUI / shadcn

暂不采用。MVP 先用 Tailwind 和本地组件，避免引入额外设计系统复杂度。

## Revisit When

以下情况需要重新评估：

- dApp Kit API 出现重大变化。
- Tailwind v4 与项目构建冲突。
- MVP 需要更完整的组件系统。
- 需要 SSR 或服务端数据预取。
