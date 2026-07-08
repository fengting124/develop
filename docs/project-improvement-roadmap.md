# Visual Authenticity Workbench 改进路线图

> 目标读者：面试官、技术 HR、后续开发者。
> 目标状态：把当前工程化 MVP 从“能跑的检测 Demo”升级为“能证明模型效果、能解释工程设计、能一键演示的求职项目”。

## 1. 调研结论

当前项目已经具备 React 前端、Java 后端、FastAPI 模型服务、PostgreSQL、Redis 异步任务、Docker Compose 和测试基础。它的问题不在于没有功能，而在于“检测能力是否可信”和“工程亮点是否可被验证”还不够强。

外部项目给出的方向很明确：

- Nonescape 提供 AI 生成图片检测模型，包含 full 权重和 mini 权重，mini 有 `safetensors` 和 `onnx` 形态，适合先做轻量真实推理服务。
  参考：<https://github.com/aediliclabs/nonescape>，<https://huggingface.co/e3ntity/nonescape-v0>
- ClipBased-SyntheticImageDetection 强调 CLIP 特征、跨生成器泛化、AUC 和鲁棒性测试，不只是给单张图片分数。
  参考：<https://github.com/grip-unina/ClipBased-SyntheticImageDetection>
- DeepfakeBench 的强点不是单个 Web 页面，而是统一数据管理、统一评估协议、多个 detector、标准化指标和可复现实验。
  参考：<https://github.com/sclbd/DeepfakeBench>
- 一些全栈 deepfake 项目会在 README 中展示 Accuracy、Precision、Recall、Confusion Matrix、ROC-AUC、架构图和截图，这些对求职展示非常直接。
  参考：<https://github.com/harshpx/deepfake-detection>
- 2026 年关于 CLIP synthetic image detection 的研究提醒：CLIP 检测器可能依赖语义偏差，跨生成器泛化会显著下降。因此项目必须展示“不确定性、评估和限制”，不能包装成万能鉴伪工具。
  参考：<https://arxiv.org/abs/2602.12381>

## 2. 项目重新定位

### 2.1 推荐定位

项目应定位为：

> 面向 AI 生成图片检测模型工程化落地的工作台。系统支持图片上传、异步推理、模型注册、检测报告、历史记录、模型评估和鲁棒性分析，用于展示如何把开源视觉检测模型接入真实业务系统。

这个定位比“deepfake 检测平台”更稳，因为它避开了视频、人脸换脸、法律鉴定这些高风险范围，也更符合当前代码的 Java 业务后端 + Python 模型服务架构。

### 2.2 MVP 后续保留的核心功能

- 单张图片检测。
- 异步检测任务。
- 真实 Nonescape Mini 推理。
- 检测报告和历史记录。
- 模型注册与健康检查。
- 批量评估。
- 鲁棒性评估。
- README 演示和 CI。

### 2.3 继续明确不做的功能

- 不做完整视频 deepfake 检测。
- 不做音频检测。
- 不做文本检测。
- 不做法律级证据鉴定。
- 不做多租户、计费、复杂 RBAC。
- 不做自研训练大模型。
- 不在仓库提交模型权重、上传图片、数据库文件。

## 3. 面试官视角的差距清单

### 3.1 真实模型能力不足

当前 `model-services/nonescape-mini/app/scoring.py` 仍是启发式打分，不是真实模型。面试官一旦追问模型权重、输入预处理、推理设备、性能指标，当前答案会比较薄。

改进目标：

- 模型服务真正加载 `nonescape-mini-v0.onnx` 或 `nonescape-mini-v0.safetensors`。
- `/health` 返回模型是否已加载、运行设备、权重版本。
- `/api/v1/predict` 返回真实模型分数、阈值、耗时、模型版本。
- 保留 `heuristic` runtime 作为开发 fallback，但默认配置必须指向真实 runtime。

### 3.2 缺少评估闭环

当前只能对单图生成报告，不能回答“模型效果如何”。优秀项目会展示数据集、指标、混淆矩阵、错误样本。

改进目标：

- 支持上传评估集 manifest。
- 支持批量运行检测。
- 保存每个样本的真实标签、预测标签、分数、耗时。
- 计算 Accuracy、Precision、Recall、F1、AUC。
- 前端展示混淆矩阵和错误样本。

### 3.3 鲁棒性和泛化表达不足

检测模型在 JPEG 压缩、缩放、截图、裁剪、跨生成器场景下经常不稳定。求职项目如果能主动展示这个问题，会显得更专业。

改进目标：

- 对同一张图生成 JPEG 95/75/50、resize、center crop 等扰动版本。
- 对扰动版本批量检测。
- 展示分数漂移、标签翻转、最大/最小分数。
- 报告中明确“模型对该样本是否稳定”。

### 3.4 工程可信度还不够完整

已有测试和 Docker 基础，但还缺统一 CI、OpenAPI 展示、README 演示材料、运行截图。

改进目标：

- GitHub Actions 跑前端、后端、Python 测试。
- README 展示架构图、功能截图、核心 API、评估结果截图。
- Springdoc OpenAPI 可访问。
- Docker Compose 全链路 smoke test 可复现。
- 结构化日志包含 `taskId`、`assetId`、`reportId`。

## 4. 目标架构

```text
React Frontend
  |
  | /api
  v
Spring Boot Backend
  |-- Detection Workflow
  |-- Evaluation Workflow
  |-- Robustness Workflow
  |-- Model Registry
  |-- Report Service
  |-- Storage Service
  |
  | PostgreSQL
  | Redis Streams
  | Local/Volume Storage
  |
  | HTTP model contract
  v
Python Model Services
  |-- nonescape-mini runtime
  |-- later: clip-based runtime
```

设计原则：

- Java 只负责业务流程、持久化、任务编排和报告，不写深度学习推理。
- Python 模型服务只负责模型加载、预处理、推理和模型端健康检查。
- 前端所有 API 调用集中在 `src/api/backend.ts`。
- 每个大功能都必须能通过测试或 smoke command 验证。
- 所有“检测结果”都必须表达为辅助信号，避免绝对化宣传。

## 5. 后端改进计划

### Phase A：模型服务真实化

目标：把模型端从 heuristic demo 升级为真实 Nonescape Mini runtime。

后端影响：

- 保持现有 `ModelInferenceClient` HTTP contract 稳定。
- 增加模型 runtime 元信息字段透传：
  - `runtime`
  - `device`
  - `weightsSha256`
  - `preprocessVersion`
  - `modelLoadedAt`
- `model_prediction.raw_response` 保存模型端详细输出。

模型服务影响：

- 新增 `app/runtime/base.py`
  - 定义 `ModelRuntime` 接口。
  - 方法：`health()`, `predict(image_path, threshold)`.
- 新增 `app/runtime/heuristic.py`
  - 保留当前启发式逻辑，作为无权重 fallback。
- 新增 `app/runtime/nonescape_onnx.py`
  - 使用 ONNX Runtime 加载 mini 权重。
  - 支持 `MODEL_DEVICE=cpu|cuda`。
  - 支持 `MODEL_WEIGHTS_PATH=/models/weights/nonescape-mini-v0.onnx`。
- 修改 `/health`
  - 返回 `status`, `runtime`, `modelLoaded`, `device`, `weightsPath`, `weightsSha256`。
- 修改 `/api/v1/predict`
  - 真实模型输出 `normalizedScore`。
  - 保留 `rawResponse`，包含 input size、preprocess、device、runtime。

验收标准：

- 无权重时服务可启动，但 `/health` 明确 `modelLoaded=false`。
- 有权重时 `/health` 为 `modelLoaded=true`。
- Python 测试覆盖缺失图片、坏图、无权重 fallback、mock runtime 预测。
- Java 后端不需要知道模型内部实现。

### Phase B：评估数据模型

目标：让项目能回答“模型效果如何”。

新增数据库表：

- `evaluation_run`
  - `evaluation_id`
  - `name`
  - `dataset_name`
  - `model_id`
  - `status`
  - `total_samples`
  - `completed_samples`
  - `accuracy`
  - `precision_score`
  - `recall_score`
  - `f1_score`
  - `auc_score`
  - `created_at`
  - `started_at`
  - `completed_at`
  - `failure_reason`
- `evaluation_sample`
  - `sample_id`
  - `evaluation_id`
  - `asset_id`
  - `filename`
  - `ground_truth_label`
  - `predicted_label`
  - `score`
  - `latency_ms`
  - `correct`
  - `failure_reason`
  - `created_at`
- `evaluation_metric_snapshot`
  - `snapshot_id`
  - `evaluation_id`
  - `threshold`
  - `accuracy`
  - `precision_score`
  - `recall_score`
  - `f1_score`
  - `false_positive_count`
  - `false_negative_count`

新增 Java 包建议：

```text
backend-java/src/main/java/com/fengting/aigcforensics/
  evaluation/
    controller/
    service/
    repository/
    domain/
    dto/
```

API：

- `POST /api/evaluations`
  - 创建评估任务。
  - 输入：`name`, `modelId`, `manifest`.
- `POST /api/evaluations/{evaluationId}/run-async`
  - 异步执行评估。
- `GET /api/evaluations`
  - 分页查询评估列表。
- `GET /api/evaluations/{evaluationId}`
  - 评估详情，含指标和样本摘要。
- `GET /api/evaluations/{evaluationId}/samples?correct=false`
  - 查询错误样本。

manifest 格式：

```csv
filename,label
real_001.jpg,AUTHENTIC
sdxl_001.jpg,SYNTHETIC
```

验收标准：

- 支持 10-200 张图片的小型评估集。
- 评估任务可失败、可重跑、可查询进度。
- 指标计算有单元测试。
- 前端能展示至少 Accuracy、Precision、Recall、F1、混淆矩阵。

### Phase C：鲁棒性评估

目标：体现对真实落地风险的理解。

新增后端能力：

- `RobustnessTransformService`
  - `JPEG_Q95`
  - `JPEG_Q75`
  - `JPEG_Q50`
  - `RESIZE_1024`
  - `CENTER_CROP_90`
- `RobustnessEvaluationService`
  - 对单个 asset 生成扰动版本。
  - 调用检测流程。
  - 计算分数漂移和标签翻转。

API：

- `POST /api/detections/{taskId}/robustness`
  - 对已有检测任务做扰动测试。
- `GET /api/detections/{taskId}/robustness`
  - 返回扰动结果。

数据库表：

- `robustness_run`
- `robustness_variant`

验收标准：

- 报告页能展示原图分数和扰动分数。
- 如果标签翻转，报告明确提示“该检测结果对常见扰动不稳定”。
- 不宣称鲁棒性测试能证明图片真伪。

### Phase D：工程化增强

目标：让项目像“可以交付的系统”。

后端：

- 增加 Spring Boot Actuator。
- 增加结构化日志字段：
  - `requestId`
  - `taskId`
  - `assetId`
  - `evaluationId`
- 文件上传增强：
  - 限制大小。
  - 检查 MIME type。
  - 检查文件魔数。
  - 拒绝超大像素图。
- API 查询增强：
  - `GET /api/detections?page=0&size=20&status=COMPLETED`
  - `GET /api/models/{modelId}`
  - `PATCH /api/models/{modelId}`
- 错误响应统一：
  - `code`
  - `message`
  - `traceId`
  - `timestamp`

CI：

- `.github/workflows/ci.yml`
  - Node install + lint + build。
  - Maven test。
  - Python pytest。
  - 可选 Docker build。

文档：

- README 加：
  - 架构图。
  - 项目边界。
  - 演示截图。
  - API 示例。
  - 模型来源和许可证。
  - 本地运行命令。
  - 已知限制。

## 6. 前端改进计划

### Phase E：信息架构收敛

目标：把当前展示型页面收敛成检测工作台，不让面试官觉得功能发散。

导航建议：

- `检测工作台`
  - 单图上传。
  - 任务状态。
  - 跳转报告。
- `检测报告`
  - 原图信息。
  - 预测结果。
  - 模型信息。
  - 鲁棒性结果。
  - 风险说明。
- `检测历史`
  - 任务列表。
  - 状态过滤。
  - 报告链接。
- `模型管理`
  - 模型注册表。
  - 健康检查。
  - 阈值展示。
- `模型评估`
  - 新建评估。
  - 指标面板。
  - 混淆矩阵。
  - 错误样本。
- `系统状态`
  - 后端、Redis、模型服务健康状态。

建议弱化或重命名：

- `AdminExperts` 改成 `Model Registry`。
- `AdminAnomaly` 改成 `Evaluation`。
- `AdminPipeline` 改成 `System Pipeline`。
- `DetectVideo` 暂时隐藏，或标注为实验入口，不作为主流程。

### Phase F：报告页增强

目标：报告页成为项目展示的核心。

报告页需要展示：

- 基础信息：
  - filename
  - contentType
  - size
  - width/height
  - sha256
- 检测结果：
  - verdict
  - confidence
  - riskLevel
  - disclaimer
- 模型证据：
  - modelId
  - modelVersion
  - threshold
  - latencyMs
  - runtime/device
- 鲁棒性：
  - 原始分数。
  - JPEG/resize/crop 后分数。
  - 是否发生标签翻转。
- 时间线：
  - uploaded
  - queued
  - inferencing
  - completed/failed

UI 原则：

- 保留当前冷静、专业、深色系风格。
- 不增加营销式大 hero。
- 用表格、状态点、指标卡、紧凑图表表达信息。
- 结论必须用“可能”“辅助信号”“建议复核”，不写绝对判断。

### Phase G：评估页

目标：成为求职作品的核心亮点页。

页面结构：

- 顶部：评估任务状态和模型版本。
- 指标区：
  - Accuracy
  - Precision
  - Recall
  - F1
  - AUC
- 混淆矩阵：
  - TP
  - FP
  - FN
  - TN
- 样本列表：
  - filename
  - ground truth
  - prediction
  - score
  - latency
  - correct
- 错误样本筛选：
  - false positive
  - false negative
- 阈值分析：
  - 不同 threshold 下 precision/recall 变化。

前端技术细节：

- 继续使用 CSS Modules。
- 不引入复杂状态管理，除非评估页状态明显膨胀。
- `src/api/backend.ts` 继续作为唯一 API 边界。
- 新增类型：
  - `EvaluationRunResponse`
  - `EvaluationSampleResponse`
  - `EvaluationMetricsResponse`
  - `ConfusionMatrixResponse`

## 7. 推荐实施顺序

### 第 1 优先级：真实模型接入

分支：`feature/real-nonescape-runtime`

原因：这是从 demo 到 AI 项目的核心跃迁。

验收：

- 模型服务加载真实 mini 权重。
- Java 后端调用无需改业务流程。
- 报告展示真实模型版本。
- README 明确权重下载方式。

### 第 2 优先级：评估模块后端

分支：`feature/evaluation-backend`

原因：让项目具备“模型效果可证明”的能力。

验收：

- 数据库表完成。
- 创建评估任务。
- 批量执行。
- 计算指标。
- 后端测试覆盖指标计算和任务状态。

### 第 3 优先级：评估模块前端

分支：`feature/evaluation-frontend`

原因：让面试官一眼看到技术深度。

验收：

- 新建评估页。
- 指标卡。
- 混淆矩阵。
- 错误样本列表。
- 评估详情路由。

### 第 4 优先级：鲁棒性评估

分支：`feature/robustness-analysis`

原因：比继续加功能更能体现模型落地意识。

验收：

- 支持 JPEG/resize/crop 扰动。
- 计算分数漂移。
- 报告页展示稳定性提示。

### 第 5 优先级：CI 和展示材料

分支：`feature/project-polish-ci-docs`

原因：技术 HR 和面试官首先看到的是 README、CI、截图和运行方式。

验收：

- GitHub Actions 全绿。
- README 有演示截图和架构图。
- Docker smoke test 文档可执行。
- 说明项目限制和模型许可证。

## 8. 简历表达升级路径

当前可写：

> 设计并实现 AI 生成图片检测工作台 MVP，采用 React + Spring Boot + FastAPI + PostgreSQL + Redis 构建交互层、业务层、模型服务层和数据层，支持图片上传、异步推理、模型注册、检测报告、历史记录和模型健康检查。

完成真实模型接入后可写：

> 接入开源 Nonescape Mini 图像检测模型，设计 Java 后端到 Python 模型服务的稳定 HTTP 推理契约，支持模型版本、阈值、延迟、设备信息和原始响应持久化。

完成评估模块后可写：

> 构建模型评估模块，支持 labeled manifest 批量检测、Accuracy/Precision/Recall/F1/AUC 指标计算、混淆矩阵和错误样本分析，用于验证检测模型在小型数据集上的表现。

完成鲁棒性模块后可写：

> 实现 JPEG 压缩、缩放、裁剪等扰动测试，分析检测分数漂移和标签翻转，增强模型落地场景下的风险解释能力。

## 9. 技术取舍

### 为什么先做 Nonescape Mini 而不是 ClipBased

Nonescape Mini 权重更轻，适合 3090、本地 CPU fallback 和 Docker 演示。ClipBased 更适合作为第二模型或评估对照，因为它依赖 CLIP/open_clip/timm，环境和权重更重。

### 为什么先做评估而不是多模型

没有评估体系，多模型只是多个分数。先把指标、样本、错误分析建起来，后续接第二模型才有对比价值。

### 为什么不恢复视频检测

视频 deepfake 涉及抽帧、时序建模、脸部定位、视频级聚合、数据集和算力，第一版很难做实。当前项目应避免“看起来大，问起来空”。

### 为什么 Java 后端继续保留

用户希望业务代码用 Java。并且 Java 后端负责业务流程、事务、数据一致性、任务队列、报告生成，能体现后端开发能力；Python 只承担模型推理，边界清楚。

## 10. 最终验收目标

项目达到求职展示状态时，应满足：

- `docker compose -f infra/docker-compose.yml up --build` 能启动核心服务。
- README 能在 3 分钟内让面试官理解项目价值。
- 单图检测能生成真实模型报告。
- 评估页能展示一组样本的指标和错误样本。
- 报告页能解释模型版本、阈值、延迟、hash、限制。
- GitHub Actions 展示前端、后端、模型服务测试通过。
- 项目没有夸大检测能力，没有把辅助信号包装成法律级结论。

## 11. 当前执行备注

2026-07-08 更新：

- Phase A 已完成模型 runtime adapter 框架，但真实 `nonescape-mini-v0.onnx`
  权重下载和 GPU/服务器推理验证暂缓。
- 暂缓原因：本地环境不需要强制下载权重，权重文件不应进入 Git，真实模型验证应放到
  后续 GPU 服务器环境中完成。
- 当前优先级调整为：先完成文档治理和项目工作记录，再进入 Phase B
  评估模块后端。
- 权重接入恢复时，新开独立分支 `feature/server-model-weight-integration`。

2026-07-08 Phase B 第一片更新：

- `feature/evaluation-backend` 已开始评估模块后端基础建设。
- 第一片范围：评估运行表、评估样本表、CSV manifest 导入、指标计算、查询 API。
- 明确暂不做：评估图片集上传、Redis 批量执行、逐样本调用模型服务、前端评估页。
- 原因：先稳定数据模型和指标口径，再接异步执行和前端展示，避免一次性拉大范围。

2026-07-08 Phase B second backend slice:

- Branch: `feature/evaluation-batch-execution`.
- Scope: batch execution orchestration, evaluation model-call boundary, failed
  attempt persistence, manual retry, and generated sample predictions.
- Constraint: real model weights and GPU inference remain deferred to the later
  server model integration branch.
- Next frontend branch: `feature/evaluation-frontend`, focused on listing
  evaluation runs, showing metrics, and inspecting wrong samples.
