# AI 图像真实性检测与模型评估平台设计文档

## 1. 项目边界结论

本项目定位为一个面向求职展示的 **AI 图像真实性检测与模型评估平台**。它不是一个宣称能识别所有 deepfake、所有 AI 视频、所有生成模型的万能系统，而是一个把开源 AI 图像检测模型工程化落地的完整应用。

项目要展示的核心能力是：

- Java 后端业务建模能力。
- 前后端完整交互能力。
- AI 模型服务接入能力。
- 模型结果持久化、报告化、可对比能力。
- 工程化部署、可测试、可扩展能力。

本项目第一版只解决 **图片** 场景，不把视频检测作为核心功能。

## 2. 要解决的问题

随着 Stable Diffusion、Midjourney、DALL-E、Flux、Firefly 等生成工具普及，平台内容审核、媒体核验、企业素材管理、法务证据初筛等场景都需要一种低成本的辅助判断工具。

但现实问题是：

- 单个 AI 检测模型不可靠，不应该被当作真相裁判。
- 开源模型往往只有脚本或 demo，缺少业务系统落地能力。
- 模型结果通常只有一个分数，缺少任务记录、模型版本、阈值、耗时、输入 hash、评估记录等工程信息。
- 普通用户不关心模型细节，需要报告化结果。
- 开发者和面试官更关心系统是否有清晰边界、可靠接口、可维护架构。

所以本项目解决的问题定义为：

> 构建一个可接入多种开源 AI 图像检测模型的 Java 业务系统，让用户上传图片后，系统能完成文件管理、检测任务编排、模型服务调用、结果保存、报告生成、历史查询和批量评估，提供“辅助判断”而不是“绝对判定”。

## 3. 不解决的问题

以下内容明确不作为第一版目标：

- 不做视频 deepfake 片段检测。
- 不做音频 deepfake 检测。
- 不做文本 AI 检测。
- 不训练自研大模型。
- 不宣称检测结果具备法律证明力。
- 不承诺能识别所有生成器。
- 不做复杂用户体系、租户体系、计费体系。
- 不做 Kubernetes、微服务治理、复杂链路追踪。
- 不做 stacking meta-learner 作为第一版功能。
- 不做 SD3、Flux、DALL-E、Midjourney 专属专家模型。

这些功能可以作为论文阅读、实验室页面或后续路线，但不能污染第一版项目边界。

## 4. 求职展示目标

这个项目最终要能在简历和面试中讲清楚：

1. 我解决了什么业务问题。
2. 为什么这个问题不能只靠一个 Python 脚本。
3. Java 后端如何组织任务、文件、模型、报告。
4. AI 模型如何被服务化接入。
5. 为什么要做模型注册、健康检查和版本记录。
6. 为什么检测结果只能作为辅助判断。
7. 如何做批量评估，证明模型在样本集上的效果。
8. 如何用 Docker Compose 启动完整系统。

建议简历表述：

> 设计并实现 AI 图像真实性检测与模型评估平台，基于 React + Spring Boot + Python 模型服务构建完整检测链路。系统支持图片上传、异步检测任务、模型服务注册、检测历史、报告生成和批量评估；接入 Nonescape Mini 等开源 AI 图像检测模型，通过 Java 后端编排模型调用并持久化模型版本、阈值、耗时、输入 hash 和推理结果，实现从交互层、业务层、模型层到数据层的完整闭环。

## 5. 推荐系统名称

可选名称：

- ImageTrust Lab
- AIGC Image Forensics Lab
- Visual Authenticity Workbench
- AI Image Authenticity Platform

结合你现有前端风格，推荐使用：

> Visual Authenticity Workbench

中文名：

> AI 图像真实性检测与评估平台

## 6. 用户角色

第一版只定义两个逻辑角色，不做复杂权限系统。

### 6.1 普通分析用户

关心：

- 上传图片。
- 查看检测结果。
- 查看报告。
- 查询历史记录。

对应页面：

- 首页。
- 图片检测页。
- 报告页。
- 历史记录页。

### 6.2 系统演示/管理员用户

关心：

- 当前接入了哪些模型。
- 模型是否可用。
- 每个模型的版本、阈值、耗时。
- 批量评估结果。

对应页面：

- 模型管理页。
- 批量评估页。
- 系统概览页。

第一版可以不做登录，默认所有页面可访问。后续如果需要体现权限，可以加一个非常轻量的管理员开关或 JWT 登录。

## 7. 核心功能范围

### 7.1 图片上传检测

用户上传一张图片，系统创建检测任务。

支持格式：

- JPG
- JPEG
- PNG
- WebP

第一版限制：

- 单张图片最大 10MB。
- 图片最长边不超过 4096px，超过则后端生成推理用缩放副本。
- 不支持视频。
- 不支持批量上传作为普通检测入口，批量只用于评估模块。

输出：

- 任务 ID。
- 任务状态。
- 最终检测报告 ID。

### 7.2 检测任务状态

任务状态用于驱动前端动画和进度，而不是前端写死 timer。

状态枚举：

- `UPLOADED`
- `QUEUED`
- `PREPROCESSING`
- `INFERENCING`
- `AGGREGATING`
- `COMPLETED`
- `FAILED`

第一版可以同步执行模型调用，但仍然保存任务状态。后续再替换为异步队列。

### 7.3 模型服务调用

Java 后端不直接写模型推理逻辑。Java 后端通过 HTTP 调用模型服务。

模型服务统一接口：

- `GET /health`
- `GET /metadata`
- `POST /predict`

第一版只接一个真实模型：

- `nonescape-mini`

第二版再接：

- `nonescape-full`
- `clipbased-detector`

### 7.4 检测报告

报告是项目的核心业务产物，不只是模型分数展示。

报告必须包含：

- 报告 ID。
- 任务 ID。
- 原始文件名。
- 图片 hash。
- 图片尺寸。
- 文件大小。
- 检测结论。
- 综合置信度。
- 使用的模型列表。
- 每个模型的分数。
- 每个模型的阈值。
- 每个模型的版本。
- 每个模型的推理耗时。
- 检测时间。
- 结果解释。
- 风险提示。

检测结论枚举：

- `LIKELY_SYNTHETIC`
- `LIKELY_AUTHENTIC`
- `UNCERTAIN`

报告解释原则：

- 不写“该图片一定是 AI 生成”。
- 使用“模型判断为较高概率 AI 生成”。
- 明确提示“检测结果仅作为辅助判断”。

### 7.5 检测历史

用户可以查看最近检测记录。

历史列表字段：

- 任务 ID。
- 缩略图。
- 原始文件名。
- 检测结论。
- 综合置信度。
- 创建时间。
- 状态。

支持：

- 按结论筛选。
- 按时间倒序。
- 点击进入报告。

第一版不做用户隔离，所有记录都是本地系统记录。

### 7.6 模型注册表

模型注册表用于声明系统当前知道哪些模型。

字段：

- 模型 ID。
- 模型名称。
- 模型版本。
- 模型类型。
- 服务地址。
- 是否启用。
- 默认阈值。
- 权重。
- 描述。

第一版可以存放在数据库，也可以由 Java 后端初始化种子数据。建议最终放数据库，方便管理页展示。

### 7.7 模型健康检查

Java 后端定期或按需调用模型服务 `/health`。

前端模型管理页展示：

- 模型名称。
- 状态：ONLINE / OFFLINE / DISABLED。
- 最近健康检查时间。
- 平均耗时。
- 版本。

### 7.8 批量评估

批量评估是本项目非常重要的求职亮点。它展示系统不是只会“调模型”，还能对模型效果进行工程化评估。

第一版支持：

- 上传一个小型评估集。
- 每张图片带真实标签：`synthetic` 或 `authentic`。
- 系统逐张调用模型。
- 输出 Accuracy、Precision、Recall、F1、平均耗时。

为了降低实现复杂度，第一版可以采用 CSV + 本地图片目录形式：

CSV 字段：

```csv
filename,label
samples/real_001.jpg,authentic
samples/fake_001.jpg,synthetic
```

评估结果字段：

- 评估 ID。
- 样本数量。
- 模型 ID。
- Accuracy。
- Precision。
- Recall。
- F1。
- 平均耗时。
- 创建时间。

不做：

- 大规模数据集训练。
- 自动下载百万级数据集。
- 复杂 benchmark pipeline。

### 7.9 模型对比

当系统接入多个模型后，支持同一张图片返回多个模型结果。

第一版只有一个模型，因此接口先预留数组结构。

第二版支持：

- Nonescape Mini vs Nonescape Full。
- Nonescape vs ClipBased。

对比维度：

- 分数。
- 结论。
- 耗时。
- 阈值。
- 模型版本。

## 8. 明确降级的现有前端功能

### 8.1 DetectVideo 页面

现状：视频检测页做了时间线、片段证据、专家投票等强展示。

调整：

- 不作为核心功能。
- 改名为“实验室：视频抽帧分析”或暂时隐藏。
- 如果保留，只展示抽帧和“帧级图片检测分数”。
- 不输出 fake range。
- 不宣称视频深伪检测。

原因：

- 图片检测模型不能可靠解决视频检测。
- 视频生成器痕迹和图片生成器不同。
- 做不好会削弱项目可信度。

### 8.2 AdminExperts 页面

现状：专家协同、LoRA 专家、生成器专家。

调整：

- 改成“模型注册与健康检查”。
- 展示真实模型服务，而不是虚构专家。

保留视觉形式：

- 卡片。
- 状态。
- 权重。
- 耗时。

删除概念：

- SD3 LoRA 专家。
- FLUX LoRA 专家。
- Midjourney 专家。
- DALL-E 专家。

### 8.3 AdminAnomaly 页面

现状：异常样本池。

调整：

- 改成“评估样本集”。
- 展示真实/AI 样本、标签、模型预测结果。

### 8.4 AdminPipeline 页面

现状：流水线展示偏视觉化。

调整：

- 改成真实系统 pipeline：
  - 上传。
  - 预处理。
  - 模型调用。
  - 结果聚合。
  - 报告生成。

### 8.5 Report 页面

保留并加强。

报告页是核心页面，要从 mock 展示改成真实报告数据。

## 9. 技术栈选择

### 9.1 前端

保留现有：

- React 18
- TypeScript
- Vite
- React Router
- Framer Motion
- CSS Modules

不引入复杂 UI 框架，避免破坏现有视觉风格。

前端职责：

- 上传图片。
- 展示任务进度。
- 展示报告。
- 展示历史。
- 展示模型状态。
- 展示批量评估结果。

### 9.2 Java 后端

业务代码使用 Java 实现。

推荐：

- Java 21，若环境不方便则 Java 17。
- Spring Boot 3.x。
- Maven。
- Spring Web。
- Spring Validation。
- Spring Data JPA 或 MyBatis-Plus。
- PostgreSQL Driver。
- Flyway。
- Lombok 可选。
- springdoc-openapi。

ORM 推荐：

- 国内 Java 岗可选 MyBatis-Plus。
- 项目简洁和对象建模可选 Spring Data JPA。

本项目推荐 **Spring Data JPA + Flyway**：

- 实体关系清晰。
- SQL migration 可控。
- 项目代码更少。
- 面试可讲领域建模。

如果你更偏国内业务开发岗位，也可以切换为 MyBatis-Plus。

### 9.3 模型服务

模型服务使用 Python。

推荐：

- Python 3.10/3.11。
- FastAPI。
- PyTorch。
- safetensors。
- ONNX Runtime 可选。
- Pillow。

第一版模型服务：

- `model-service-nonescape`

职责：

- 加载 Nonescape Mini。
- 提供 `/health`。
- 提供 `/metadata`。
- 提供 `/predict`。

Java 后端只关心模型服务 HTTP 协议，不关心模型内部实现。

### 9.4 数据库

开发期：

- PostgreSQL。

不建议先用 H2：

- 图片检测历史和 JSON 结果最终会落 PostgreSQL。
- 直接用 PostgreSQL 能减少迁移。

本地启动：

- Docker Compose 启动 PostgreSQL。

### 9.5 文件存储

第一版：

- 本地文件系统。

目录：

```text
storage/
  uploads/
  thumbnails/
  reports/
  evaluation/
```

后续可替换：

- MinIO。
- S3。

通过 `StorageService` 抽象隔离。

### 9.6 部署

第一版 Docker Compose：

```text
frontend
backend-java
model-service-nonescape
postgres
```

后续可加：

```text
nginx
clipbased-model-service
```

## 10. 总体架构

```text
React Frontend
  |
  | HTTP /api
  v
Spring Boot Backend
  |
  |-- TaskService
  |-- MediaAssetService
  |-- DetectionService
  |-- ModelRegistryService
  |-- ReportService
  |-- EvaluationService
  |
  | HTTP /predict
  v
Python Model Service
  |
  |-- Nonescape Mini
  |-- Nonescape Full later
  |-- ClipBased later
  |
  v
PostgreSQL + Local Storage
```

## 11. 业务流程

### 11.1 单图检测流程

```text
1. 用户上传图片
2. Java 后端校验格式和大小
3. Java 后端计算 SHA-256 hash
4. Java 后端保存原图
5. Java 后端生成缩略图
6. Java 后端创建 detection_task
7. Java 后端读取启用模型列表
8. Java 后端调用模型服务 /predict
9. 模型服务返回分数、标签、耗时、模型版本
10. Java 后端保存 model_prediction
11. Java 后端聚合结果
12. Java 后端生成 detection_report
13. 前端展示报告
```

### 11.2 批量评估流程

```text
1. 用户准备样本集和 labels.csv
2. 用户上传评估集
3. Java 后端创建 evaluation_run
4. Java 后端逐张图片创建内部检测任务
5. Java 后端调用指定模型
6. Java 后端对比预测结果和真实标签
7. Java 后端计算 Accuracy、Precision、Recall、F1
8. 前端展示评估结果和错误样本
```

## 12. 后端模块设计

### 12.1 Controller

```text
HealthController
MediaController
DetectionTaskController
ReportController
ModelController
EvaluationController
```

### 12.2 Service

```text
StorageService
MediaAssetService
DetectionTaskService
ModelRegistryService
ModelClientService
DetectionOrchestrator
ReportService
EvaluationService
HashService
ThumbnailService
```

### 12.3 Repository

```text
MediaAssetRepository
DetectionTaskRepository
ModelRegistryRepository
ModelPredictionRepository
DetectionReportRepository
EvaluationRunRepository
EvaluationSampleRepository
```

## 13. 数据模型

### 13.1 media_asset

保存上传图片信息。

字段：

- `id`
- `asset_id`
- `original_filename`
- `content_type`
- `file_size`
- `sha256`
- `width`
- `height`
- `storage_path`
- `thumbnail_path`
- `created_at`

唯一约束：

- `sha256`

### 13.2 detection_task

保存检测任务。

字段：

- `id`
- `task_id`
- `asset_id`
- `status`
- `failure_reason`
- `created_at`
- `started_at`
- `completed_at`

### 13.3 model_registry

保存模型注册信息。

字段：

- `id`
- `model_id`
- `display_name`
- `model_type`
- `version`
- `endpoint_url`
- `enabled`
- `default_threshold`
- `weight`
- `description`
- `created_at`
- `updated_at`

### 13.4 model_prediction

保存模型输出。

字段：

- `id`
- `prediction_id`
- `task_id`
- `model_id`
- `model_version`
- `raw_score`
- `normalized_score`
- `label`
- `threshold`
- `latency_ms`
- `raw_response_json`
- `created_at`

### 13.5 detection_report

保存报告。

字段：

- `id`
- `report_id`
- `task_id`
- `verdict`
- `confidence`
- `summary`
- `risk_level`
- `report_json`
- `created_at`

### 13.6 evaluation_run

保存批量评估任务。

字段：

- `id`
- `evaluation_id`
- `model_id`
- `dataset_name`
- `sample_count`
- `accuracy`
- `precision`
- `recall`
- `f1`
- `average_latency_ms`
- `created_at`

### 13.7 evaluation_sample

保存评估样本。

字段：

- `id`
- `evaluation_id`
- `filename`
- `ground_truth`
- `predicted_label`
- `score`
- `correct`
- `latency_ms`

## 14. API 设计

### 14.1 健康检查

`GET /api/health`

响应：

```json
{
  "status": "ok",
  "service": "image-authenticity-backend",
  "time": "2026-07-07T00:00:00Z"
}
```

### 14.2 上传并创建检测任务

`POST /api/detections`

请求：

```multipart
file: image
```

响应：

```json
{
  "taskId": "task_abc",
  "assetId": "asset_abc",
  "status": "QUEUED"
}
```

### 14.3 查询任务

`GET /api/detections/{taskId}`

响应：

```json
{
  "taskId": "task_abc",
  "status": "COMPLETED",
  "assetId": "asset_abc",
  "reportId": "report_abc",
  "failureReason": null
}
```

### 14.4 查询报告

`GET /api/reports/{reportId}`

响应：

```json
{
  "reportId": "report_abc",
  "taskId": "task_abc",
  "verdict": "LIKELY_SYNTHETIC",
  "confidence": 0.91,
  "riskLevel": "HIGH",
  "summary": "The enabled detector reports a high probability that this image is AI-generated.",
  "asset": {
    "filename": "sample.png",
    "sha256": "..."
  },
  "predictions": [
    {
      "modelId": "nonescape-mini",
      "modelVersion": "v0",
      "score": 0.91,
      "label": "SYNTHETIC",
      "threshold": 0.5,
      "latencyMs": 132
    }
  ],
  "disclaimer": "This result is an auxiliary signal and should not be used as the sole basis for high-stakes decisions."
}
```

### 14.5 查询历史

`GET /api/detections?status=COMPLETED&page=0&size=20`

响应：

```json
{
  "items": [
    {
      "taskId": "task_abc",
      "reportId": "report_abc",
      "filename": "sample.png",
      "verdict": "LIKELY_SYNTHETIC",
      "confidence": 0.91,
      "createdAt": "2026-07-07T00:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "total": 1
}
```

### 14.6 查询模型

`GET /api/models`

响应：

```json
[
  {
    "modelId": "nonescape-mini",
    "displayName": "Nonescape Mini",
    "version": "v0",
    "enabled": true,
    "defaultThreshold": 0.5,
    "weight": 1.0,
    "status": "ONLINE"
  }
]
```

### 14.7 模型健康检查

`POST /api/models/{modelId}/health-check`

响应：

```json
{
  "modelId": "nonescape-mini",
  "status": "ONLINE",
  "latencyMs": 21,
  "checkedAt": "2026-07-07T00:00:00Z"
}
```

### 14.8 创建评估任务

`POST /api/evaluations`

请求：

```multipart
datasetName: demo-set
labelsCsv: file
imagesZip: file
modelId: nonescape-mini
```

响应：

```json
{
  "evaluationId": "eval_abc",
  "status": "COMPLETED",
  "sampleCount": 20
}
```

### 14.9 查询评估结果

`GET /api/evaluations/{evaluationId}`

响应：

```json
{
  "evaluationId": "eval_abc",
  "modelId": "nonescape-mini",
  "datasetName": "demo-set",
  "sampleCount": 20,
  "accuracy": 0.85,
  "precision": 0.88,
  "recall": 0.82,
  "f1": 0.85,
  "averageLatencyMs": 138
}
```

## 15. 模型服务协议

### 15.1 GET /health

响应：

```json
{
  "status": "ok",
  "modelId": "nonescape-mini"
}
```

### 15.2 GET /metadata

响应：

```json
{
  "modelId": "nonescape-mini",
  "modelVersion": "v0",
  "task": "ai-generated-image-detection",
  "input": "image",
  "output": "binary-score",
  "license": "Apache-2.0"
}
```

### 15.3 POST /predict

请求：

```json
{
  "requestId": "req_abc",
  "imagePath": "/storage/uploads/task_abc/input.png",
  "threshold": 0.5
}
```

响应：

```json
{
  "requestId": "req_abc",
  "modelId": "nonescape-mini",
  "modelVersion": "v0",
  "score": 0.91,
  "label": "SYNTHETIC",
  "threshold": 0.5,
  "latencyMs": 132,
  "raw": {
    "syntheticProbability": 0.91,
    "authenticProbability": 0.09
  }
}
```

## 16. 模型选择

### 16.1 第一模型：Nonescape Mini

理由：

- 专门面向 AI-generated image detection。
- 有 Python 和 JavaScript SDK。
- 有 open weights。
- 有 mini 模型，接入成本低。
- Apache 2.0。
- 支持 safetensors 和 ONNX。

用途：

- 第一版真实检测模型。
- 模型服务 MVP。
- 批量评估 MVP。

### 16.2 第二模型：Nonescape Full

理由：

- 同一项目下的更强模型。
- 便于做 Mini vs Full 对比。

后置原因：

- 更重。
- 第一版不需要一开始接。

### 16.3 第三模型：ClipBased-SyntheticImageDetection

理由：

- 学术背书强。
- 基于 CLIP。
- 自带权重。
- Apache 2.0。

后置原因：

- 默认是 CSV 批处理脚本。
- 依赖更重。
- 服务化需要适配。

### 16.4 不推荐第一版使用 EfficientNet-B0 deepfake 项目作为主模型

理由：

- 更偏人脸 deepfake。
- 训练数据和通用 AIGC 图片检测目标不完全一致。
- 可以学习其简单工程结构，但不作为主能力。

## 17. 前端页面调整

### 17.1 保留

- Home。
- DetectImage。
- Report。
- AdminOverview。
- AdminPipeline。
- AdminExperts。
- AdminAnomaly。

### 17.2 新增或重命名

- DetectionHistory：检测历史。
- Evaluation：批量评估。
- ModelRegistry：模型注册与健康检查。

### 17.3 隐藏或降级

- DetectVideo。

建议：

- 第一版路由保留，但入口隐藏。
- 页面文案改成实验室，不展示为核心能力。

## 18. 第一版 MVP

第一版 MVP 只做完整闭环。

必须完成：

- Java Spring Boot 后端。
- PostgreSQL。
- 本地文件存储。
- 图片上传接口。
- 检测任务表。
- 模型注册表。
- Nonescape Mini 模型服务。
- Java 后端调用模型服务。
- 检测报告。
- 检测历史。
- 前端图片检测页接真实 API。
- 前端报告页接真实 API。
- Docker Compose 启动 PostgreSQL、Java 后端、模型服务。

不做：

- 批量评估。
- 多模型融合。
- 用户登录。
- 视频。
- 报告 PDF 导出。

## 19. 第二版

第二版加入模型评估能力。

必须完成：

- 批量评估上传。
- CSV 标签解析。
- EvaluationRun。
- EvaluationSample。
- Accuracy、Precision、Recall、F1。
- 错误样本列表。
- 前端评估页。

可选：

- 评估结果导出 CSV。

## 20. 第三版

第三版加入多模型对比。

必须完成：

- Nonescape Full。
- ClipBased detector。
- 多模型启停。
- 多模型同图对比。
- 简单 weighted average。

不做：

- stacking meta-learner。

## 21. 第四版

第四版做工程完善。

可做：

- Docker Compose 一键启动前端。
- OpenAPI 文档。
- 后端单元测试。
- 模型服务 smoke test。
- GitHub Actions。
- 报告导出。
- MinIO 替换本地文件系统。
- 简单 JWT 登录。

## 22. 验收标准

### 22.1 MVP 验收

MVP 完成时必须能演示：

1. 打开前端。
2. 上传图片。
3. 后端保存文件。
4. 后端创建任务。
5. 后端调用 Nonescape Mini 服务。
6. 模型返回分数。
7. 后端保存结果。
8. 前端显示报告。
9. 历史记录中能看到本次检测。
10. 模型管理页能看到 Nonescape Mini 在线。

### 22.2 技术验收

命令：

```powershell
npm run build
```

```powershell
cd backend-java
mvn test
```

```powershell
docker compose up --build
```

接口：

- `GET /api/health` 正常。
- `GET /api/models` 正常。
- `POST /api/detections` 正常。
- `GET /api/reports/{reportId}` 正常。

## 23. 风险与应对

### 23.1 模型效果不稳定

风险：

- 不同生成器、压缩、截图、二次编辑会显著影响检测结果。

应对：

- 文案强调辅助判断。
- 报告展示模型、阈值、版本。
- 做批量评估页展示模型局限。

### 23.2 模型部署复杂

风险：

- PyTorch、CUDA、ONNX Runtime 环境可能卡住。

应对：

- 第一版优先 Nonescape Mini。
- 模型服务允许 CPU fallback。
- Dockerfile 独立维护。
- Java 后端不依赖 Python 包。

### 23.3 项目再次膨胀

风险：

- 想加视频、用户系统、复杂管理后台。

应对：

- 所有新功能必须回答：是否服务于图片检测闭环或模型评估闭环。
- 不满足则进入 backlog，不进 MVP。

### 23.4 前端现有文案乱码

风险：

- 当前文件有中文乱码，影响展示。

应对：

- MVP 阶段优先修复核心页面文案。
- 不重写全部页面，只修检测页、报告页、模型页。

## 24. Backlog

仅在前三版完成后考虑：

- 视频抽帧实验页。
- PDF 报告导出。
- 用户登录。
- MinIO。
- RabbitMQ。
- Prometheus。
- 多租户。
- 模型 stacking。
- 大规模 benchmark。

## 25. 最终项目边界一句话

> 本项目是一个 Java 后端主导的 AI 图像真实性检测与模型评估平台，核心价值在于把开源 AI 检测模型封装成可管理、可调用、可评估、可报告的工程系统，而不是宣称发明一个万能深伪检测模型。

