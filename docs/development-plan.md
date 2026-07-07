# AI 图像真实性检测与模型评估平台开发规划

## 1. 项目定位

本项目定位为一个面向求职展示的 **AI 图像真实性检测与模型评估平台**。

它不是一个“万能 deepfake 检测器”，也不是一个大而全的多模态内容安全平台。它要解决的问题是：

> 如何把开源 AI 图像检测模型工程化落地为一个可上传、可检测、可记录、可报告、可评估的完整业务系统。

项目核心价值：

- 用 Java 实现业务后端。
- 用 React 实现完整交互层。
- 用 Python/ONNX 模型服务承载 AI 推理。
- 用 PostgreSQL 保存任务、图片、模型输出和报告。
- 用 Docker Compose 串起前端、Java 后端、模型服务和数据库。

详细设计见：

`docs/superpowers/specs/2026-07-07-image-authenticity-platform-design.md`

## 2. 项目边界

### 2.1 第一版解决什么

第一版只做 **图片真实性辅助检测**。

必须支持：

- 单张图片上传。
- Java 后端保存文件。
- Java 后端创建检测任务。
- Java 后端调用真实模型服务。
- 模型服务返回 AI 生成概率。
- Java 后端保存模型结果。
- Java 后端生成检测报告。
- 前端展示检测报告。
- 前端展示检测历史。
- 模型管理页展示模型健康状态。

### 2.2 第一版不做什么

第一版明确不做：

- 视频检测。
- 视频 fake range 时间线。
- 音频检测。
- 文本检测。
- 用户登录。
- RBAC 权限。
- 多租户。
- PDF 报告导出。
- MinIO。
- RabbitMQ。
- Kubernetes。
- Prometheus。
- stacking meta-learner。
- 自研训练大模型。
- SD3、Flux、DALL-E、Midjourney 专属专家模型。

这些内容可以进入 backlog，但不能进入 MVP。

## 3. 推荐技术栈

### 3.1 前端

保留现有技术栈：

- React 18。
- TypeScript。
- Vite。
- React Router。
- Framer Motion。
- CSS Modules。

第一阶段重点不是重做视觉，而是把现有图片检测页、报告页、后台页接到真实 API。

### 3.2 Java 后端

业务代码使用 Java。

推荐：

- Java 21，若环境不方便则 Java 17。
- Spring Boot 3.x。
- Maven。
- Spring Web。
- Spring Validation。
- Spring Data JPA。
- Flyway。
- PostgreSQL Driver。
- springdoc-openapi。

后端目录建议：

```text
backend-java/
  pom.xml
  src/main/java/com/fengting/aigcforensics/
    AigcForensicsApplication.java
    controller/
    service/
    repository/
    domain/
    dto/
    client/
    config/
    common/
  src/main/resources/
    application.yml
    db/migration/
  src/test/java/
```

### 3.3 模型服务

模型服务使用 Python，不把推理逻辑塞进 Java。

推荐：

- Python 3.10/3.11。
- FastAPI。
- PyTorch。
- safetensors。
- Pillow。
- ONNX Runtime 可选。

第一版模型服务：

```text
model-services/
  nonescape-service/
    app.py
    detector.py
    requirements.txt
    weights/
```

### 3.4 数据库

使用 PostgreSQL。

核心表：

- `media_asset`
- `detection_task`
- `model_registry`
- `model_prediction`
- `detection_report`
- `evaluation_run`
- `evaluation_sample`

MVP 可以先实现前五张表，评估相关表放第二版。

### 3.5 文件存储

第一版使用本地文件系统。

目录：

```text
storage/
  uploads/
  thumbnails/
  reports/
  evaluation/
```

通过 Java `StorageService` 抽象，后续可以替换为 MinIO。

## 4. 模型选择

### 4.1 第一模型：Nonescape Mini

第一版真实模型使用 Nonescape Mini。

理由：

- 面向 AI-generated image detection。
- 有 Python 和 JavaScript SDK。
- 有 open weights。
- 有 mini safetensors/ONNX。
- Apache 2.0。
- 接入成本低。

参考：

- GitHub: https://github.com/e3ntity/nonescape
- Hugging Face: https://huggingface.co/e3ntity/nonescape-v0

### 4.2 第二模型：Nonescape Full

第二版可接 Nonescape Full，用于 Mini vs Full 对比。

### 4.3 第三模型：ClipBased-SyntheticImageDetection

第三版可接 ClipBased detector。

它学术背书更强，基于 CLIP，适合做模型对比和评估页。

参考：

- GitHub: https://github.com/grip-unina/ClipBased-SyntheticImageDetection

### 4.4 不作为主模型：EfficientNet-B0 deepfake 项目

TRahulsingh/DeepfakeDetector 可作为工程参考，但不作为第一版主模型。

原因：

- 更偏人脸 deepfake。
- 不够贴合通用 AIGC 图片检测。
- 适合作为轻量模型服务写法参考。

参考：

- https://github.com/TRahulsingh/DeepfakeDetector

## 5. 系统架构

```text
React Frontend
  |
  | /api
  v
Spring Boot Backend
  |
  |-- MediaAssetService
  |-- DetectionTaskService
  |-- DetectionOrchestrator
  |-- ModelRegistryService
  |-- ModelClientService
  |-- ReportService
  |-- StorageService
  |
  | HTTP
  v
Python Model Service
  |
  |-- Nonescape Mini
  |
  v
PostgreSQL + Local Storage
```

## 6. 版本路线

### 6.1 MVP：单模型图片检测闭环

目标：

> 用户上传图片，系统调用 Nonescape Mini，返回真实检测报告。

任务：

1. 重写 README，明确项目定位。
2. 新建 `backend-java` Spring Boot 项目。
3. 新建 PostgreSQL migration。
4. 实现图片上传。
5. 实现文件 hash 和本地存储。
6. 实现检测任务。
7. 实现模型注册表。
8. 新建 `model-services/nonescape-service`。
9. Java 后端调用模型服务。
10. 保存模型输出。
11. 生成检测报告。
12. 前端图片检测页接真实 API。
13. 前端报告页接真实 API。
14. 前端历史页或后台概览展示历史。
15. Docker Compose 启动 PostgreSQL、Java 后端和模型服务。

验收：

- `POST /api/detections` 可上传图片。
- `GET /api/detections/{taskId}` 可查任务。
- `GET /api/reports/{reportId}` 可查报告。
- `GET /api/models` 可查模型。
- 前端能完成一次真实检测。

### 6.2 V2：批量评估

目标：

> 展示模型效果，而不是只展示单次检测。

任务：

1. 实现评估集上传。
2. 支持 `labels.csv`。
3. 保存 `evaluation_run`。
4. 保存 `evaluation_sample`。
5. 计算 Accuracy、Precision、Recall、F1。
6. 前端新增评估页。
7. 展示错误样本列表。

### 6.3 V3：多模型对比

目标：

> 接入第二个模型，展示模型服务化和模型比较能力。

任务：

1. 接入 Nonescape Full 或 ClipBased。
2. 模型注册表支持启停。
3. 同一张图片调用多个模型。
4. 报告展示多个模型结果。
5. 可选实现 weighted average。

### 6.4 V4：工程完善

目标：

> 让项目更像可以交付的工程系统。

任务：

1. Docker Compose 加入前端。
2. 增加 OpenAPI 文档。
3. 增加后端单元测试。
4. 增加模型服务 smoke test。
5. 增加 GitHub Actions。
6. 可选增加简单 JWT 登录。
7. 可选增加报告导出。

## 7. 现有前端功能调整

### 7.1 DetectImage

保留，改成核心页面。

调整：

- 上传后调用 Java API。
- 检测动画由任务状态驱动。
- 展示真实模型分数。

### 7.2 Report

保留并加强。

调整：

- 展示真实 report。
- 增加模型版本、阈值、耗时、hash、免责声明。

### 7.3 DetectVideo

降级或隐藏。

不作为第一版核心入口。

若保留，文案必须写成：

> 实验室功能：视频抽帧分析，不代表完整视频 deepfake 检测。

### 7.4 AdminExperts

改成模型注册与健康检查。

删除虚构专家概念。

### 7.5 AdminAnomaly

改成评估样本集。

### 7.6 AdminPipeline

改成真实检测流水线展示。

## 8. 可靠性原则

项目所有文案必须遵守：

- 不写“准确识别所有 AI 图片”。
- 不写“判断真伪的最终依据”。
- 不写“法律级鉴定”。
- 使用“辅助判断”“模型信号”“风险提示”“可能为 AI 生成”。

报告必须包含免责声明：

> 检测结果仅作为辅助信号，不应作为高风险决策的唯一依据。

## 9. 外部参考代码

参考代码已拉到：

```text
D:\workspace\references\
```

包含：

- `nonescape`
- `ClipBased-SyntheticImageDetection`
- `DeepfakeDetector`

原则：

- 可以学习接口和模型加载方式。
- 不大段复制代码。
- 使用第三方模型时在 README 中注明来源和许可证。

## 10. 下一步

下一步只做文档和项目骨架：

1. 用本规划替换旧的大而全路线。
2. 写 Java 后端实施计划。
3. 重写 README。
4. 新建 `backend-java`。
5. 新建 `model-services/nonescape-service`。
6. 做最小检测闭环。

不要先做视频，不要先做多模型，不要先做复杂后台。

