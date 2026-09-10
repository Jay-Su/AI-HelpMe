import { KnowledgeChunk } from '../types';

/**
 * ============================================================================
 * AI 与大模型全栈开发领域权威知识库 (Fullstack AI Engineering Pack)
 * ============================================================================
 * 
 * 涵盖五大支柱：
 * 1. 现代大模型全景体系 (Fullstack Landscape)
 * 2. Agent 智能体与工具调用 (Function Calling & ReAct)
 * 3. 大模型微调体系 (SFT / LoRA / QLoRA / DPO)
 * 4. 高性能推理与算力优化 (vLLM / PagedAttention / KV Cache)
 * 5. 工业级高阶 RAG 体系 (混合检索 / Cross-Encoder Rerank / GraphRAG)
 * 6. 经典深度学习与 Transformer 基石 (Self-Attention / 反向传播 / PyTorch)
 * 7. 模型量化与轻量化部署 (AWQ / GPTQ / GGUF / 端云协同)
 */
export const AI_CHUNKS: KnowledgeChunk[] = [
  {
    chunkId: 'ai_fullstack_llm_engineering_01',
    domain: 'ai_engine',
    title: '现代 AI 与大模型工程开发核心知识全景体系',
    language: 'markdown',
    frameworkVersion: 'Fullstack AI Engineering 2026',
    keywords: [
      'ai开发',
      '核心知识',
      'ai知识',
      '大模型开发',
      'ai重点',
      'llm开发',
      '大模型核心',
      'ai核心',
      '大模型全景',
      '人工智能开发',
      'ai开发核心知识',
      'ai学习路线',
    ],
    apiContract:
      '必须系统完整梳理现代大模型（LLM）开发的核心知识体系：涵盖底层算法基础、大模型训练微调、云端高并发推理加速、RAG与知识库增强、Agent智能体与工具调用五大支柱体系。绝不可仅局限于端侧或RAG，必须展现全栈宏观架构视野。',
    skeletonTemplate: `### 一、 现代 AI 与大模型工程开发定位与全貌
当今工业界以大语言模型（LLM）为核心的 AI 开发，绝不仅是调用 API，而是形成了纵深极强的**四大层级与五大支柱体系**：

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│  第四层：AI 应用与智能体工程 (Agent / Function Calling / RAG) │
├─────────────────────────────────────────────────────────────┤
│  第三层：高性能推理与算力基础设施 (vLLM / PagedAttention / 量化)│
├─────────────────────────────────────────────────────────────┤
│  第二层：模型预训练与微调对齐 (Pre-training / SFT / LoRA / DPO)│
├─────────────────────────────────────────────────────────────┤
│  第一层：底层数学与深度学习基石 (线性代数 / BP / Transformer)  │
└─────────────────────────────────────────────────────────────┘
\`\`\`

### 二、 现代 AI 开发五大核心支柱体系
1. **模型基座与压缩量化 (Model & Quantization)**：
   - 区分 Base（基座预训练）、Instruct（指令对齐）与 Reasoning（长思维链深度推理，如 DeepSeek-R1 / o1）；
   - 掌握 AWQ / GPTQ / GGUF 4-bit 量化，将数十 GB 的模型无损压缩至消费级 GPU 或端侧芯片。
2. **提示词工程与上下文管理 (Prompt Engineering)**：
   - 掌握 ChatML 结构化角色分层协议（system, user, assistant）；
   - 熟悉 In-Context Learning（上下文学习）、Few-Shot 提示与严格 JSON Schema 格式化输出约束。
3. **RAG 检索增强体系 (Retrieval-Augmented Generation)**：
   - 解决事实幻觉与私有数据滞后的工业利器：文档结构化切片、Embedding 向量化与向量数据库（Milvus / Pgvector）；
   - 稠密向量 + BM25 稀疏关键词的混合检索，配合 Cross-Encoder Rerank 精排。
4. **Agent 智能体与工具生态 (Function Calling & Multi-Agent)**：
   - 大模型充当中央决策大脑，基于 ReAct（思考-行动-观察）闭环解决复杂任务；
   - 掌握原生 Function Calling 驱动数据库、API 与代码执行沙箱，实现长短期记忆与多智能体协同（AutoGen / CrewAI）。
5. **参数高效微调 (PEFT / LoRA / QLoRA)**：
   - 告别代价昂贵的全量微调，利用 LoRA 低秩适配层在单张消费级显卡上训练行业专用大模型；
   - 掌握 SFT（监督指令微调）数据工程清洗与 DPO（直接偏好对齐优化）。`,
    mustHaveFeatures: [],
    pitfalls:
      '现代 AI 开发最忌【只见树木不见森林】（误把端侧量化或 RAG 当作 AI 的全貌），或者盲目投入数百万预算从头预训练底模。工业界 95% 的顶级 AI 落地均是“成熟开源基座 + 高质量微调 + 混合检索 RAG + Agent 编排”的工程闭环。',
    sourceAuthority: 'Fullstack AI & Large Language Model System Design 2026',
  },
  {
    chunkId: 'ai_agent_function_calling_02',
    domain: 'ai_engine',
    title: 'Agent 智能体架构与 Function Calling 工具调用生态实战',
    language: 'markdown',
    frameworkVersion: 'Autonomous Agent Standard',
    keywords: [
      'agent',
      '智能体',
      'function calling',
      '工具调用',
      'react',
      '多智能体',
      'langchain',
      'llamaindex',
      'autogen',
      'crewai',
      '智能体开发',
    ],
    apiContract:
      '必须清晰拆解现代 Agent 智能体的四大支柱（大脑Planning规划、记忆Memory、工具Tools、执行Execution）以及 ReAct 闭环机制，讲透模型如何通过 Function Calling 输出结构化 JSON 驱动外部世界。',
    skeletonTemplate: `### 一、 Agent 智能体核心定义
**Agent（人工智能体）** 是以大模型为决策大脑，具备环境感知、自主规划、工具调用（Function Calling）与长短期记忆能力的自动化决策闭环实体。

### 二、 Agent 核心四大支柱架构
1. **规划决策 (Planning)**：
   - **任务拆解 (Task Decomposition)**：将复杂目标分解为可执行的子任务链（如 Plan-and-Solve）；
   - **自省反思 (Self-Reflection / Reflexion)**：模型对上一轮行动的报错或执行结果进行评估纠偏。
2. **记忆系统 (Memory)**：
   - **短期工作记忆**：当前会话上下文窗口（Context Window / Scratchpad）；
   - **长期持久记忆**：将历史行为与外部知识写入向量数据库（RAG），按需相似度召回。
3. **工具生态 (Tools / Function Calling)**：
   - 大模型输出符合 JSON Schema 的标准参数；
   - 宿主系统拦截并调用底层真实工具（如 SQL查询、搜索引擎、Shell命令、API接口）；
   - 将工具执行结果作为 Observation 回填给大模型继续推演。
4. **ReAct 运行闭环 (Reasoning + Acting)**：
   - **Thought（思考）**：分析当前状态，规划下一步；
   - **Action（行动）**：决定调用哪个具体工具与入参；
   - **Observation（观察）**：捕获工具执行返回值，循环推演直至达成 Final Answer。`,
    mustHaveFeatures: [],
    pitfalls:
      '构建 Agent 最忌【无限制死循环】与【工具调用越权】。必须设置严格的 Max Steps 思考轮次上限防范 Token 烧尽，同时对于执行写操作（如写数据库、发邮件、执行命令）的工具必须设置沙箱隔离与人工确认确认机制（Human-in-the-loop）。',
    sourceAuthority: 'ReAct: Synergizing Reasoning and Acting in Language Models (ICLR)',
  },
  {
    chunkId: 'ai_peft_lora_finetuning_03',
    domain: 'ai_engine',
    title: '大模型微调体系：SFT 指令对齐与 LoRA / QLoRA 参数高效微调',
    language: 'markdown',
    frameworkVersion: 'PEFT / HuggingFace',
    keywords: [
      '微调',
      'lora',
      'qlora',
      'sft',
      'peft',
      '大模型微调',
      '指令微调',
      'rlhf',
      'dpo',
      'deepspeed',
      '模型训练',
    ],
    apiContract:
      '必须讲透为什么工业界极少全量微调（Full Fine-Tuning）而采用 LoRA/QLoRA，阐明低秩分解数学本质（W = W0 + B*A），以及 SFT 格式与 DPO 对齐机制。',
    skeletonTemplate: `### 一、 为什么工业界全面转向 LoRA / PEFT？
- **全量微调痛点**：全量微调需要更新模型 100% 的参数与优化器状态（AdamW 需为每个参数保存一阶与二阶动量），显存开销通常是模型权重的 4~6 倍，成本高昂且容易出现灾难性遗忘；
- **参数高效微调 (PEFT)**：保持预训练大模型权重完全冻结，仅训练极少量附加参数（通常占总参数的 0.1%~1%）。

### 二、 LoRA 与 QLoRA 底层数学本质
1. **LoRA（Low-Rank Adaptation，低秩适配）**：
   - 假设大模型权重更新量具有极低的内在秩（Intrinsic Rank $r \\ll d$）；
   - 权重更新量分解为两个低秩矩阵之积：$\\Delta W = B \\times A$，其中 $B \\in \\mathbb{R}^{d \\times r}, A \\in \\mathbb{R}^{r \\times k}$；
   - 前向计算公式：$h = W_0 x + \\frac{\\alpha}{r} B A x$；
   - 显存需求骤降 75% 以上，训练完毕后可直接将权重合并回原底模，实现推理零额外延迟。
2. **QLoRA（量化低秩微调）三大关键技术**：
   - **4-bit NormalFloat (NF4)**：针对正态分布权重优化的理论最优信息量化；
   - **双重量化 (Double Quantization)**：对量化常数进行二次量化，每参数再节省 0.37 bit 显存；
   - **分页优化器 (Paged Optimizers)**：显存暴涨时自动将优化器状态逐页借用 CPU 内存防崩溃。
   - 效果：单张 24GB 消费级显卡（RTX 3090/4090）即可微调 33B~70B 参数的大模型！

### 三、 SFT 阶段与偏好对齐
- **SFT（监督微调）**：输入包含 system, instruction/user, output/assistant 的结构化问答对，让模型学习特定格式与业务专有规范；
- **DPO（Direct Preference Optimization，直接偏好优化）**：无需额外训练复杂的奖励模型（Reward Model），直接基于人类偏好正反例对（chosen vs rejected）优化策略网络，比传统 PPO 更加稳定收敛。`,
    mustHaveFeatures: [],
    pitfalls:
      '微调切忌【脏数据堆砌】与【盲目全量更新】。大模型微调的核心是“数据质量高于数量（Quality > Quantity）”，1000 条人工精雕细琢的高质量问答往往胜过 10 万条爬虫低质语料；同时微调时必须混合 5%~10% 的通用保留数据集，防止基座模型的常识推理能力退化。',
    sourceAuthority: 'LoRA: Low-Rank Adaptation of Large Language Models (Microsoft Research)',
  },
  {
    chunkId: 'ai_high_perf_inference_vllm_04',
    domain: 'ai_engine',
    title: '云端大模型高性能推理与显存加速：vLLM、PagedAttention 与 KV Cache',
    language: 'markdown',
    frameworkVersion: 'vLLM / TensorRT-LLM',
    keywords: [
      'vllm',
      '推理加速',
      'pagedattention',
      'kv cache',
      'tensorrt-llm',
      '吞吐优化',
      '连续批处理',
      'prefill',
      'decode',
      '大模型推理',
    ],
    apiContract:
      '必须透彻解析大模型推理的内存带宽瓶颈（Memory-Bound），讲透 PagedAttention 显存分页管理如何将显存浪费从 60% 压降至 4% 以下，以及连续批处理与投机解码原理。',
    skeletonTemplate: `### 一、 大模型推理的两大核心阶段
大模型推理与训练不同，其计算过程天然分为两个特征截然相反的阶段：
1. **预填充阶段 (Prefill / Prompt Phase)**：
   - 瞬间并行处理输入的完整 Prompt 序列；
   - 计算密集型（Compute-Bound），充分吃满 GPU 张量计算单元。
2. **自回归解码阶段 (Decode / Token Generation Phase)**：
   - 逐字逐词生成下一个 Token；
   - 内存带宽受限型（Memory-Bound），每次吐字都必须把庞大的几十 GB 权重与历史键值缓存（KV Cache）从显存搬移到计算核心中。

### 二、 PagedAttention 显存分页革命 (vLLM 核心机理)
- **传统推理显存痛点**：传统框架必须为每个请求按照最长可能生成的上下文（如 4096 Tokens）预分配一段连续显存，导致严重的内部碎片与外部碎片，显存浪费高达 60%~80%；
- **PagedAttention 方案**：
  - 借鉴操作系统虚拟内存分页思想（Virtual Memory Paging）；
  - 将每个序列的 KV Cache 划分为固定大小的逻辑块（Blocks，例如每个 Block 容纳 16 个 Tokens 的 KV 张量）；
  - 通过页表（Block Table）将逻辑块动态映射到物理不连续的显存块中；
  - 显存浪费降低至 4% 以下，GPU 实际并发吞吐提升 2~4 倍！

### 三、 高性能推理关键加速技术
1. **连续批处理 (Continuous Batching / Iteration-level Scheduling)**：
   - 抛弃传统按 Request 批处理等待所有请求结束的机制，而在每一次 Token 生成迭代（Iteration）级别动态插入新请求或剔除已完成请求，消除显卡空等待气泡（Bubble）；
2. **投机解码 (Speculative Decoding)**：
   - 使用极小的草稿模型（Draft Model，如 1B）极速预生成 3~5 个候选 Token；
   - 主模型（Target Model，如 70B）进行单次并行前向验证打分，一次性接受多个词，延迟降低 40%~50%。`,
    mustHaveFeatures: [],
    pitfalls:
      '高并发生产部署最忌【未设显存水位熔断】与【盲目提高并发度】。当并发请求激增导致 KV Cache 耗尽物理显存时，若未启用请求抢占（Preemption）与按优先级重排策略，会导致整台 GPU 节点触发 CUDA Out of Memory 崩溃雪崩。',
    sourceAuthority: 'vLLM: Efficient Memory Management for Large Language Model Serving with PagedAttention (SOSP)',
  },
  {
    chunkId: 'ai_advanced_rag_pipeline_05',
    domain: 'ai_engine',
    title: '工业级高阶 RAG 架构：混合检索、Cross-Encoder Rerank 与图谱增强',
    language: 'markdown',
    frameworkVersion: 'Production RAG Architecture',
    keywords: [
      'rag',
      '检索增强',
      '混合检索',
      'rerank',
      '向量数据库',
      'milvus',
      'chroma',
      'embedding',
      'graphrag',
      '防幻觉',
      'rag架构',
    ],
    apiContract:
      '必须系统梳理企业级高阶 RAG（Advanced RAG）全流程：切片分块、向量+BM25混合检索（Hybrid Search）、Rerank 重排、GraphRAG 全局推理，以及防幻觉过滤机制。',
    skeletonTemplate: `### 一、 核心定义与诞生价值
- **全称**：**RAG（Retrieval-Augmented Generation，检索增强生成）**；
- **核心定位**：在向大模型提问前，先从外部权威私域知识库检索出最相关的真实片段装入 Prompt，彻底根治大模型的**事实性幻觉**并解决**企业私有数据与知识时效性滞后**难题。

### 二、 工业级 Advanced RAG 标准技术链路
\`\`\`
原始文档 ──> 结构化解析 ──> 语义分块(Chunking) ──> 向量化(Embedding) ──> 向量库/倒排索引
                                                                     │
用户提问 ──> 意图改写 ──> [稠密向量检索 + BM25稀疏检索] ──> 混合召回 (Hybrid Search)
                                                                     │
                                           Cross-Encoder Rerank 深度精排重打分
                                                                     │
最终回答 <── 大模型生成推理 <── 结构化上下文装配 (Top-3 权威片段 + 严格门禁)
\`\`\`

1. **索引构建阶段 (Indexing)**：
   - 结构化提取：准确解析表格、PDF 层级与 Markdown 标题树；
   - 语义切片：按章节或语义完整性拆分为 300~500 Tokens 的切片，保留段落上下文元数据（Metadata）；
2. **混合检索召回 (Hybrid Search)**：
   - **稠密向量检索 (Dense Vector)**：捕获语义相似度（如 “打车” 匹配 “网约车”）；
   - **稀疏关键词检索 (BM25 / FTS)**：精确锁定专有名词、特定函数名、项目代码、型号等；
   - **RRF 倒数排名融合 (Reciprocal Rank Fusion)**：无量纲合并两路得分，兼顾广度与精确度。
3. **重排器精打分 (Rerank)**：
   - 向量检索仅计算双塔单向量余弦相似度，无法理解复杂的句子细微交互；
   - 采用 Cross-Encoder 重排模型将 (Query, Document) 整体送入 Transformer 联合交叉打分，从 Top-50 初筛中精选 Top-3 核心事实。
4. **进阶 GraphRAG (知识图谱检索增强)**：
   - 抽取实体与关联关系三元组，在复杂宏观总结问题（如“分析整份财报全年的风险点”）上超越传统孤立切片检索。`,
    mustHaveFeatures: [],
    pitfalls:
      '生产落地最忌【纯纯单一向量检索】与【缺失相似度门禁】。纯向量在数字编号、精确函数名上经常漏召回；未设置置信度门禁（低于阈值直接 0 召回），会导致模型把无关噪点强行当作权威事实进行解答，引发更严重的技术幻觉。',
    sourceAuthority: 'Advanced RAG Pipeline Design & Retrieval Benchmarks 2026',
  },
  {
    chunkId: 'ai_transformer_deep_learning_06',
    domain: 'ai_engine',
    title: '经典深度学习基石与 Transformer 架构核心机理',
    language: 'markdown',
    frameworkVersion: 'Deep Learning / PyTorch',
    keywords: [
      'transformer',
      '深度学习',
      '自注意力',
      'self-attention',
      'pytorch',
      '反向传播',
      '梯度下降',
      'cuda',
      '注意力机制',
      '深度学习核心',
    ],
    apiContract:
      '必须透彻讲解 Transformer 的 Self-Attention 自注意力机制计算公式及维度推导，解释 Q/K/V 物理含义与除以根号 dk 的数学意义，并梳理反向传播与优化器本质。',
    skeletonTemplate: `### 一、 Transformer 自注意力机制核心数学原理
Transformer 之所以彻底取代传统 RNN，关键在于**自注意力机制（Self-Attention）**实现了任意长距离 Token 之间的常数级 $O(1)$ 路径直达关联，并天然支持全序列并行计算。

#### 1. 核心计算公式：
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V$$

#### 2. Q / K / V 核心物理含义：
- **$Q$ (Query，查询向量)**：当前 Token 想要寻找什么样的上下文信息；
- **$K$ (Key，键向量)**：每个 Token 自身的属性标签，用于与 $Q$ 计算相关度；
- **$V$ (Value，值向量)**：每个 Token 包含的具体语义内容；
- **为什么要缩放除以 $\\sqrt{d_k}$**：当向量维度 $d_k$ 很大时，点积 $Q K^T$ 的方差会随之增大，导致 Softmax 函数输出被推向极端饱和区（梯度极小），除以 $\\sqrt{d_k}$ 能将点积方差稳定拉回 1，防止梯度消失。

### 二、 Multi-Head Attention 多头注意力机制
- 将 $d_{\\text{model}}$ 维度映射拆分为 $h$ 个独立的头（如 8 或 32 个头）并行计算注意力；
- 使得模型能同时在不同表示子空间捕捉多元信息（如一个头关注主谓宾语法依赖，另一个头关注长程共指消解）。

### 三、 深度学习底层训练生命周期
1. **前向传播 (Forward Pass)**：输入张量经过逐层矩阵乘法、非线性激活函数与 LayerNorm，计算损失函数 Loss；
2. **反向传播 (Backward Pass)**：基于多元微积分链式求导法则（Chain Rule），从 Loss 逐层向后计算每个权重的梯度 $\\nabla W$；
3. **优化器参数更新 (Optimizer Step)**：AdamW 优化器结合动量（Momentum）与二阶自适应学习率更新参数，附带权重衰减（Weight Decay）防止过拟合。`,
    mustHaveFeatures: [],
    pitfalls:
      '训练深层 Transformer 时最忌【忽视梯度裁剪与学习率预热（Warmup）】。深层网络初期参数随机，容易出现瞬时巨大梯度击穿权重，必须设置梯度范数截断（Gradient Clipping，如 max_norm=1.0）配合线性 Warmup 预热。',
    sourceAuthority: 'Attention Is All You Need (NeurIPS) & PyTorch Deep Learning Internals',
  },
  {
    chunkId: 'ai_model_quant_edge_07',
    domain: 'ai_engine',
    title: '模型压缩与轻量化量化：AWQ、GPTQ、GGUF 选型与边缘端部署',
    language: 'markdown',
    frameworkVersion: 'Model Compression & Edge AI',
    keywords: [
      'gguf',
      '量化',
      'quantization',
      'awq',
      'gptq',
      '端侧模型',
      '模型压缩',
      'q4_k_m',
      'llama.cpp',
      '端侧部署',
      '边缘计算',
    ],
    apiContract:
      '必须全面对比 AWQ、GPTQ、GGUF 三大主流模型量化技术选型，明确指出云端与端侧的最佳落地实践，阐明 Q4_K_M 分级混合量化的黄金性价比。',
    skeletonTemplate: `### 一、 为什么必须做模型量化（Quantization）？
- **现实痛点**：全精度 FP16 模型每个参数占用 2 字节（例如 7B 模型权重本身需 14GB，再加上 KV Cache 与运行开销，至少需要 20GB+ 显存）；
- **量化本质**：将高精度浮点数（FP16/FP32）按特定比例映射到低位宽整数（INT8 或 INT4），参数体积直接削减 50%~75%，使大模型能够在移动手机、消费级 PC 和边缘设备上极速运行。

### 二、 工业界三大主流量化技术选型对比
| 量化方案 | 核心技术原理 | 硬件生态 | 最优适用场景 |
| :--- | :--- | :--- | :--- |
| **AWQ** (推荐云端) | 保护前 1% 显著激活权重采用高精度，其余 4-bit 量化 | NVIDIA GPU (TensorRT-LLM / vLLM) | 云端高并发推理，精度几乎无损且吞吐极高 |
| **GPTQ** | 基于二阶海森矩阵逐层贪心求解最优近似 | 云端 GPU (vLLM / HuggingFace) | 云端单卡/低显存运行开源大模型 |
| **GGUF** (推荐端侧) | 分层 K-quants 混合量化（注意力关键权重保留高精度） | CPU / ARM-NEON / Apple Metal (llama.cpp) | 手机移动端、PC 离线端侧推理主力格式 |

### 三、 端云协同现代架构
1. **云端负责重型计算与深度推理**：70B~671B 参数基模部署于云端 GPU 集群，处理通用编程推演与全局大数据分析；
2. **端侧负责隐私脱敏与极速感知**：3B~7B 参数轻量化模型部署在手机或 PC 本地芯片，负责敏感数据本地脱敏、实时 UI 意图识别与无网离线问答。`,
    mustHaveFeatures: [],
    pitfalls:
      '量化最忌【粗暴无差别的纯对称量化】（如纯 Q4_0）。对所有张量粗暴一刀切会导致模型对代码缩进、标点符号及复杂指令遵循能力的严重崩溃；必须选用针对关键 Attention 权重保留更高精度的混合量化格式（如 Q4_K_M）。',
    sourceAuthority: 'AWQ (MIT) & llama.cpp k-quants Benchmark Guide',
  },
];
