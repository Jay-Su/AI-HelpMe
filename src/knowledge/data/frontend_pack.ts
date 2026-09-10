import { KnowledgeChunk } from '../types';

/**
 * 前端工程领域权威知识卡
 */
export const FRONTEND_CHUNKS: KnowledgeChunk[] = [
  {
    chunkId: 'fe_js_debounce_01',
    domain: 'frontend',
    title: 'JavaScript 生产级防抖函数（支持立即执行与取消功能）',
    language: 'javascript',
    frameworkVersion: 'ES6+',
    keywords: [
      '防抖',
      'debounce',
      '立即执行',
      '取消',
      'cancel',
      'leading',
      'immediate',
      '闭包',
      'clearTimeout',
      '防抖函数',
    ],
    apiContract:
      '必须返回一个受控包装函数，支持 options.leading/immediate（立即执行）与 options.trailing；返回的函数实例必须显式挂载 .cancel() 方法用于清理定时器句柄与闭包重置。',
    skeletonTemplate: `/**
 * 生产级防抖函数骨架
 * @param {Function} func 目标执行函数
 * @param {number} wait 延迟毫秒数
 * @param {Object} options 选项: { leading: false, trailing: true }
 * @returns {Function} 防抖包装函数，挂载 .cancel()
 */
function debounce(func, wait, options = {}) {
  let timerId = null;
  const leading = Boolean(options.leading || options.immediate);
  const trailing = options.trailing !== undefined ? Boolean(options.trailing) : true;

  function debounced(...args) {
    const context = this;
    const isFirstCall = leading && !timerId;

    if (timerId) clearTimeout(timerId);

    if (isFirstCall) {
      func.apply(context, args);
    }

    timerId = setTimeout(() => {
      if (trailing && !isFirstCall) {
        func.apply(context, args);
      }
      timerId = null;
    }, wait);
  }

  // 必须挂载取消机制
  debounced.cancel = function() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}`,
    mustHaveFeatures: ['cancel', 'leading', 'clearTimeout', 'apply'],
    pitfalls:
      '1. 闭包保存 timerId 时，.cancel() 必须重置为 null 避免内存泄漏；2. 严禁内部使用顶层箭头函数导致丢弃调用方的 this；3. 立即执行触发后，在 wait 窗口期内不可重复触发 leading 执行。',
    sourceAuthority: 'MDN Web Docs / Lodash debounce spec',
  },
  {
    chunkId: 'fe_js_throttle_02',
    domain: 'frontend',
    title: 'JavaScript 工业级节流函数（时间戳+定时器双剑合璧）',
    language: 'javascript',
    frameworkVersion: 'ES6+',
    keywords: [
      '节流',
      'throttle',
      '滚动监听',
      '时间戳',
      '定时器',
      'trailing',
      'cancel',
      '节流函数',
    ],
    apiContract:
      '必须在指定间隔 wait 内至多执行一次，需支持 options.leading（首发响应）与 options.trailing（尾随响应），返回函数挂载 .cancel()。',
    skeletonTemplate: `function throttle(func, wait, options = {}) {
  let timerId = null;
  let previous = 0;
  const leading = options.leading !== false;
  const trailing = options.trailing !== false;

  function throttled(...args) {
    const now = Date.now();
    if (!previous && !leading) previous = now;
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timerId && trailing) {
      timerId = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timerId = null;
        func.apply(this, args);
      }, remaining);
    }
  }

  throttled.cancel = function() {
    clearTimeout(timerId);
    timerId = null;
    previous = 0;
  };
  return throttled;
}`,
    mustHaveFeatures: ['cancel', 'remaining', 'clearTimeout', 'previous'],
    pitfalls:
      '不能仅依赖 Date.now()，必须在 remaining 等待区间使用 setTimeout 补齐末次触发（trailing），保证最后一次输入状态不丢失。',
    sourceAuthority: 'Underscore.js / Lodash throttle core',
  },
  {
    chunkId: 'fe_js_deep_clone_03',
    domain: 'frontend',
    title: '深拷贝（深克隆）终极方案：解决循环引用与特殊对象类型',
    language: 'javascript',
    frameworkVersion: 'ES6+',
    keywords: [
      '深拷贝',
      '深克隆',
      'deepClone',
      '循环引用',
      'WeakMap',
      'Symbol',
      'Date',
      'RegExp',
    ],
    apiContract:
      '必须使用 WeakMap 处理循环引用防止递归栈溢出，正确克隆 RegExp、Date、Map、Set 以及 Symbol 属性。',
    skeletonTemplate: `function deepClone(target, map = new WeakMap()) {
  if (target === null || typeof target !== 'object') return target;
  if (target instanceof Date) return new Date(target);
  if (target instanceof RegExp) return new RegExp(target);
  if (map.has(target)) return map.get(target);

  const cloneTarget = Array.isArray(target) ? [] : {};
  map.set(target, cloneTarget);

  // 必须遍历 Symbol 键
  const keys = [...Object.keys(target), ...Object.getOwnPropertySymbols(target)];
  for (const key of keys) {
    cloneTarget[key] = deepClone(target[key], map);
  }
  return cloneTarget;
}`,
    mustHaveFeatures: ['WeakMap', 'RegExp', 'Date', 'getOwnPropertySymbols'],
    pitfalls:
      '1. 普通 Map 会强引用导致内存无法回收，必须使用 WeakMap 作为缓存池；2. Object.keys 会遗漏 Symbol 作为属性名的场景。',
    sourceAuthority: 'V8 内部结构与 ECMAScript 规范',
  },
  {
    chunkId: 'fe_react_closure_trap_04',
    domain: 'frontend',
    title: 'React Hooks 闭包陷阱根因剖析与 useRef 解决范式',
    language: 'typescript',
    frameworkVersion: 'React 16.8+',
    keywords: [
      '闭包陷阱',
      'useEffect',
      'useCallback',
      'useRef',
      'stale state',
      '过期状态',
      'React hooks',
    ],
    apiContract:
      '必须说明闭包捕获旧 State 的根本原因（组件重新渲染生成新作用域），提供 useRef 同步最新值或 setState 函数式更新的双重解决方案。',
    skeletonTemplate: `// 针对定时器/事件监听中访问过期 State 的标准解法
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// 示例用法:
useEffect(() => {
  const timer = setInterval(() => {
    // 通过 ref.current 永远读取最新状态，避免频繁重置定时器
    console.log(latestCountRef.current);
  }, 1000);
  return () => clearInterval(timer);
}, []); // 依赖项清空，定时器生命周期稳定`,
    mustHaveFeatures: ['useRef', 'current', 'clearInterval'],
    pitfalls:
      '在 useEffect 里直接写 setCount(count + 1) 会因为依赖数组为空闭包捕获初次值导致计数停滞，必须用 setCount(prev => prev + 1)。',
    sourceAuthority: 'React 官方文档：A Complete Guide to useEffect',
  },
  {
    chunkId: 'fe_promise_all_settled_05',
    domain: 'frontend',
    title: 'Promise.all 与 Promise.allSettled 规范级手写实现',
    language: 'javascript',
    frameworkVersion: 'ES2020 / Promise A+',
    keywords: [
      'promise',
      'promise.all',
      'promise.allsettled',
      'allSettled',
      '手写promise',
      '并发控制',
      '异步编程',
    ],
    apiContract:
      'Promise.all 遇到第一个 reject 立即失败；Promise.allSettled 必须等待所有 Promise 完成并返回结构为 { status: "fulfilled" | "rejected", value/reason } 的对象数组，且必须支持传入非 Promise 值的自动包装。',
    skeletonTemplate: `Promise.myAllSettled = function (promises) {
  return new Promise((resolve) => {
    const list = Array.from(promises);
    const total = list.length;
    if (total === 0) return resolve([]);

    const results = new Array(total);
    let settledCount = 0;

    list.forEach((item, index) => {
      // 使用 Promise.resolve 兼容非 Promise 字面量
      Promise.resolve(item).then(
        (value) => {
          results[index] = { status: 'fulfilled', value };
          if (++settledCount === total) resolve(results);
        },
        (reason) => {
          results[index] = { status: 'rejected', reason };
          if (++settledCount === total) resolve(results);
        }
      );
    });
  });
};`,
    mustHaveFeatures: ['myAllSettled', 'fulfilled', 'rejected', 'Promise.resolve'],
    pitfalls:
      '1. 必须使用 index 下标精确赋值，严禁使用 push，否则异步完成时序错乱会导致输出数组乱序；2. 传入空数组时必须立即 resolve([])。',
    sourceAuthority: 'TC39 ECMAScript Promise.allSettled Specification',
  },
  {
    chunkId: 'fe_vue3_reactivity_06',
    domain: 'frontend',
    title: 'Vue 3 响应式原理：Proxy、Reflect 与依赖收集 (Track & Trigger)',
    language: 'javascript',
    frameworkVersion: 'Vue 3.x',
    keywords: [
      'vue3',
      'reactive',
      'ref',
      'proxy',
      'reflect',
      '依赖收集',
      'track',
      'trigger',
      '响应式原理',
      'targetMap',
    ],
    apiContract:
      '必须使用 Proxy 拦截 get/set，配合 Reflect 保留正确的 this 接收者对象；使用 targetMap(WeakMap) -> depsMap(Map) -> dep(Set) 三层结构进行 track 收集与 trigger 派发。',
    skeletonTemplate: `const targetMap = new WeakMap();
let activeEffect = null;

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, (dep = new Set()));
  dep.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (dep) dep.forEach(effect => effect());
}

function reactive(target) {
  if (typeof target !== 'object' || target === null) return target;
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key);
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return result;
    }
  });
}`,
    mustHaveFeatures: ['Proxy', 'Reflect', 'track', 'trigger', 'targetMap'],
    pitfalls:
      '不使用 Reflect.get(target, key, receiver) 而是直接写 target[key] 会导致对象原型链上带有 getter 访问器属性时 this 绑定错误，使得派生属性依赖收集失效。',
    sourceAuthority: 'Vue 3 官方仓库 core/reactivity 源码实现',
  },
  {
    chunkId: 'fe_ts_type_gymnastics_07',
    domain: 'frontend',
    title: 'TypeScript 高级类型体操：Partial, Pick, Omit 与 infer 模式匹配',
    language: 'typescript',
    frameworkVersion: 'TypeScript 4.x/5.x',
    keywords: [
      'typescript',
      'ts',
      '类型体操',
      'mypick',
      'myomit',
      'pick',
      'omit',
      'partial',
      'infer',
      'keyof',
      '条件类型',
      'returntype',
      '高级类型',
      '手写ts',
    ],
    apiContract:
      '必须展示 Mapped Types（映射类型）构建自定义 MyPartial、MyPick，利用 Exclude 实现 MyOmit，并使用 infer 关键字提取函数返回值类型 MyReturnType。',
    skeletonTemplate: `// 1. 实现 MyPick
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 2. 实现 MyOmit (基于 Exclude 过滤属性名)
type MyExclude<T, U> = T extends U ? never : T;
type MyOmit<T, K extends keyof any> = {
  [P in MyExclude<keyof T, K>]: T[P];
};

// 3. 实现 MyReturnType (利用 infer 推断返回值类型)
type MyReturnType<T extends (...args: any[]) => any> = 
  T extends (...args: any[]) => infer R ? R : never;`,
    mustHaveFeatures: ['MyPick', 'MyOmit', 'infer', 'keyof'],
    pitfalls:
      '直接使用 in keyof T 无法过滤属性，必须在属性修饰层或者键重映射（as P）时过滤；infer 只能出现在 extends 条件类型的 true 分支推导表达式中。',
    sourceAuthority: 'TypeScript Handbook: Advanced Types & Type Manipulation',
  },
  {
    chunkId: 'fe_virtual_list_08',
    domain: 'frontend',
    title: '前端海量数据高性能虚拟滚动列表（Virtual List）视口计算原理',
    language: 'typescript',
    frameworkVersion: 'React / Vue 通用',
    keywords: [
      '虚拟列表',
      'virtual list',
      '虚拟滚动',
      '大数据量渲染',
      'scrollTop',
      'startIndex',
      'endIndex',
      'transform',
    ],
    apiContract:
      '必须根据容器的 scrollTop 计算出 startIndex 与 endIndex，仅渲染可视区内的 item，同时使用 transform: translateY 或 padding 撑开滚动条真实高度，防止滚动坍塌。',
    skeletonTemplate: `interface VirtualListConfig {
  itemHeight: number; // 单行固定高度
  viewportHeight: number; // 容器可视高度
  totalCount: number; // 数据总条数
}

function calculateVirtualSlice(scrollTop: number, config: VirtualListConfig, buffer = 3) {
  const { itemHeight, viewportHeight, totalCount } = config;

  // 计算可见数量
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  
  // 计算起始索引（附带上/下缓冲区 buffer）
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(totalCount, startIndex + visibleCount + buffer * 2);

  // 视口容器偏移量（防止闪烁）
  const offsetTop = startIndex * itemHeight;
  const totalHeight = totalCount * itemHeight;

  return { startIndex, endIndex, offsetTop, totalHeight };
}`,
    mustHaveFeatures: ['itemHeight', 'scrollTop', 'startIndex', 'endIndex', 'offsetTop'],
    pitfalls:
      '如果不设置前后 buffer 缓冲区（预渲染前后的 3~5 项），快速滚动时会导致白屏闪烁；若高度动态变化则必须使用二分查找 + 偏移缓存表记录每一个项的累积高度。',
    sourceAuthority: 'Web 性能优化：Rendering Large Lists With Virtualization',
  },
];
