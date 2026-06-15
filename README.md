# DEVELOP 显影前端

DEVELOP（显影）是面向图片与视频生成内容的可解释检测与取证演示前端。项目包含用户侧检测流程、图片/视频报告、治理端数据生成、专家库和异常池等页面。

## 技术栈

- React 18
- TypeScript
- Vite
- React Router
- Framer Motion
- Zustand
- CSS Modules

## 环境要求

建议使用较新的 Node.js 版本。本项目当前验证环境：

```bash
node v24.11.1
npm 11.7.0
```

如果本机 Node 版本较旧，建议升级到 Node 20+ 后再安装依赖。

## 安装与运行

进入项目目录：

```bash
cd develop
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

Vite 会在终端输出本地访问地址，通常是：

```text
http://localhost:5173/
```

## 构建与预览

生产构建：

```bash
npm run build
```

本地预览构建产物：

```bash
npm run preview
```

## 常用路由

- `/`：首页
- `/detect`：检测类型选择
- `/detect/image`：图像取证
- `/detect/video`：视频检测
- `/detect/report/:id`：鉴别报告
- `/admin`：治理中心
- `/admin/pipeline`：数据生成
- `/admin/pipeline/showcase/video`：视频标注解构台
- `/admin/pipeline/showcase/image`：图片标注工作流
- `/admin/experts`：专家库
- `/admin/anomaly`：异常池
- `/dev`：组件展示页

## 推荐演示流程

1. 打开 `/` 查看首页和项目入口。
2. 进入 `/detect/image`，上传图片或使用示例图，等待检测完成。
3. 点击“查看详细报告”，报告会展示本次检测图片、关键证据、语义链和专家网络。
4. 进入 `/detect/video`，等待视频检测完成。
5. 点击“查看完整报告”，报告会展示视频材料和片段级证据。
6. 进入 `/admin` 查看治理端能力，再按需要进入数据生成、专家库和异常池页面。

## 脚本说明

```bash
npm run dev      # 启动开发服务器
npm run build    # TypeScript 检查并构建生产包
npm run preview  # 预览 dist 构建产物
npm run lint     # 运行 ESLint
```

## 当前验证状态

最近一次验证：

```bash
npm run build
```

构建通过。

`npm run lint` 当前存在既有规则报错，主要来自以下位置：

- `src/components/GlobalHUD.tsx`：render 中调用 `Math.random`
- `src/pages/AdminAnomaly/index.tsx`：effect 中同步 setState
- `src/pages/AdminPipeline/ImageShowcase.tsx`：render 初始化中调用 `Date.now`

这些 lint 问题不影响 `npm run dev` 和 `npm run build`，但后续如果要把 lint 作为 CI 必过项，需要单独修复。

## 目录说明

```text
src/
  App.tsx                  # 路由入口
  components/              # 通用组件与业务组件
  data/                    # mock 数据与报告快照存储
  layouts/                 # 管理端布局
  pages/                   # 页面实现
  tokens/                  # 全局设计 token
public/
  images/                  # 图片素材
  samples/                 # 样本与视频帧素材
  videos/                  # 视频工作流素材
```

## 注意事项

- 项目代码位于 `develop` 目录，不是仓库根目录的旧前端。
- 不需要后端服务即可运行当前演示，检测结果和报告使用前端 mock 数据与浏览器 `sessionStorage` 快照。
- 图片报告会根据当前上传或示例图片实时生成，不再固定显示模板图。
