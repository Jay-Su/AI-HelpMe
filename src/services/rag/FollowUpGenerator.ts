import { FollowUpChip } from '../../types/session';
import { DomainType } from '../../knowledge';

const SPECIFIC_CHIP_RULES: Record<string, FollowUpChip[]> = {
  fe_js_debounce_01: [
    { id: 'f_ts', label: '增加 TS 泛型约束', prompt: '请为这个防抖函数加上完整的 TypeScript 泛型声明与参数类型推导。' },
    { id: 'f_react', label: 'React 组件实践', prompt: '请给出在 React 组件中使用该防抖函数的最佳实践，说明如何在组件卸载时正确调用 cancel 清理。' },
    { id: 'f_test', label: 'Jest 单元测试', prompt: '请为这个防抖函数编写覆盖 leading 和 cancel 特性的 Jest 单元测试用例。' },
  ],
  fe_js_throttle_02: [
    { id: 'f_react_hook', label: '封装 useThrottle Hook', prompt: '请将该节流逻辑封装为 React 自定义 useThrottle Hook。' },
    { id: 'f_scroll', label: '无限滚动实战', prompt: '请演示如何在 window 滚动监听或触底加载更多中应用该节流函数。' },
    { id: 'f_diff', label: '防抖与节流深度对比', prompt: '请用一个通俗易懂的现实比喻对比防抖（Debounce）与节流（Throttle）的适用场景。' },
  ],
  fe_js_deep_clone_03: [
    { id: 'f_clone_sc', label: '对比 structuredClone', prompt: '原生 structuredClone 与手写 deepClone 相比各有什么优缺点与兼容性差异？' },
    { id: 'f_clone_loop', label: '循环引用弱引用原理', prompt: '为什么必须使用 WeakMap 而不是普通 Map 记录克隆对象？' },
    { id: 'f_clone_proto', label: '原型链继承保留', prompt: '如果对象是某个 Class 的实例，如何确保深拷贝后的对象保留原型链方法？' },
  ],
  fe_react_closure_trap_04: [
    { id: 'f_use_event', label: 'useEvent RFC 提案', prompt: 'React 官方探索中的 useEvent 提案是如何从编译器底层彻底解决闭包陷阱的？' },
    { id: 'f_hook_test', label: '自定义 Hook 测试', prompt: '如何用 @testing-library/react-hooks 测试 useLatestRef 在重渲染时的稳定性？' },
  ],
  be_go_goroutine_leak_01: [
    { id: 'f_leak_detect', label: '自动化检测协程泄漏', prompt: '在单元测试中如何使用 goleak 库自动化检测是否有未退出的 Goroutine？' },
    { id: 'f_chan_close', label: 'Channel 优雅关闭', prompt: 'Go 语言中由谁来负责 close(channel) 才能避免 向已关闭的通道发送数据 panic？' },
  ],
  be_redis_distributed_lock_06: [
    { id: 'f_watchdog', label: '看门狗自动续期机制', prompt: '如果业务耗时超出预期，Redisson 的看门狗（Watchdog）锁续期逻辑是如何实现的？' },
    { id: 'f_reentrant', label: '可重入锁实现原理', prompt: '如何基于 Redis Hash 结构改造上述分布式锁，使其支持同一线程可重入加锁？' },
  ],
  devops_docker_multistage_01: [
    { id: 'f_docker_cache', label: '构建缓存分层优化', prompt: '在 Dockerfile 中如何优化指令顺序以最大化利用 Docker Build Cache 缩短构建时间？' },
    { id: 'f_distroless', label: 'Distroless 基础镜像', prompt: 'Google Distroless 基础镜像与 Alpine 相比有哪些安全性优势？如何配置运行？' },
  ],
  devops_linux_high_load_debug_06: [
    { id: 'f_load_vs_cpu', label: '负载高但 CPU 低根因', prompt: '为什么有时候使用 uptime 看到 Load Average 很高，但 top 看到 CPU 却很空闲？如何排查？' },
    { id: 'f_jstack', label: 'JVM 线程堆栈分析', prompt: '线上 Java 应用 CPU 100% 时，如何将 10 进制线程 PID 转换并与 jstack 堆栈精准对应？' },
  ],
};

const FALLBACK_GENERAL_CHIPS: FollowUpChip[] = [
  {
    id: 'gen_explain',
    label: '逐行解析底层原理',
    prompt: '请针对上述实现，深入剖析其底层的运行机制与关键变量的内存流转过程。',
  },
  {
    id: 'gen_perf',
    label: '性能如何进一步优化',
    prompt: '在大规模高并发或内存极度受限的严苛场景下，这段逻辑还有哪些性能优化空间？',
  },
  {
    id: 'gen_pitfall',
    label: '生产环境常见避坑指南',
    prompt: '在真实生产环境中落地这段代码时，开发者最容易踩入哪些边界隐患或异常故障陷阱？',
  },
];

export class FollowUpGenerator {
  public static generateChips(
    hitChunkId?: string | null,
    domain?: DomainType | 'all'
  ): FollowUpChip[] {
    if (hitChunkId && SPECIFIC_CHIP_RULES[hitChunkId]) {
      return SPECIFIC_CHIP_RULES[hitChunkId];
    }

    if (domain && domain !== 'all') {
      const domainChipMap: Record<DomainType, FollowUpChip> = {
        frontend: {
          id: 'dom_fe',
          label: '在现代框架中的实践',
          prompt: '请说明上述逻辑在 React 18 或 Vue 3 现代前端框架中封装与集成的最佳实践。',
        },
        backend: {
          id: 'dom_be',
          label: '高并发与幂等性防御',
          prompt: '在高并发与微服务集群场景下，上述实现如何保证接口幂等性与数据最终一致性？',
        },
        devops: {
          id: 'dom_devops',
          label: '自动化流水线集成',
          prompt: '如何将上述配置集成到标准 CI/CD 自动化部署流水线中并执行自动化健康度检测？',
        },
        ai_engine: {
          id: 'dom_ai',
          label: '大模型落地与工程调优',
          prompt: '在真实生产落地场景中，上述方案如何进行微调适配、推理加速与防幻觉设计？',
        },
      };

      return [
        domainChipMap[domain],
        FALLBACK_GENERAL_CHIPS[0],
        FALLBACK_GENERAL_CHIPS[1],
      ];
    }

    return FALLBACK_GENERAL_CHIPS;
  }
}