import { KnowledgeChunk } from '../types';

/**
 * 后端架构领域权威知识卡
 */
export const BACKEND_CHUNKS: KnowledgeChunk[] = [
  {
    chunkId: 'be_go_goroutine_leak_01',
    domain: 'backend',
    title: 'Go 语言防止 Goroutine 泄漏与优雅退出最佳实践',
    language: 'go',
    frameworkVersion: 'Go 1.18+',
    keywords: [
      'goroutine',
      '协程泄漏',
      'goroutine leak',
      'context',
      'WithCancel',
      'sync.WaitGroup',
      'select',
      '优雅退出',
      'channel',
    ],
    apiContract:
      '必须使用 context.WithCancel 或 context.WithTimeout 驱动下游协程退出，配合 select <-ctx.Done() 监听终止信号，使用 sync.WaitGroup 确保所有协程完全结束。',
    skeletonTemplate: `package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

func worker(ctx context.Context, id int, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("worker %d: 收到退出信号，安全释放资源\\n", id)
			return
		default:
			time.Sleep(100 * time.Millisecond)
		}
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	for i := 1; i <= 3; i++ {
		wg.Add(1)
		go worker(ctx, i, &wg)
	}

	wg.Wait()
	fmt.Println("所有 worker 安全退出，零协程泄露")
}`,
    mustHaveFeatures: ['context', 'WithCancel', 'WaitGroup', 'ctx.Done', 'select'],
    pitfalls:
      '1. 生产环境忘记调用 cancel() 会导致 context 树上的子 context 无法及时回收；2. 无缓冲 channel 发送方在无接收方时永久阻塞是 Goroutine 泄漏高发地。',
    sourceAuthority: 'Effective Go / Go Concurrency Patterns',
  },
  {
    chunkId: 'be_node_stream_backpressure_02',
    domain: 'backend',
    title: 'Node.js 大文件流式处理与背压机制（Backpressure）',
    language: 'javascript',
    frameworkVersion: 'Node.js 16+',
    keywords: [
      'node.js',
      'stream',
      '背压',
      'backpressure',
      'createReadStream',
      'createWriteStream',
      'pipeline',
      '大文件处理',
      '内存溢出',
    ],
    apiContract:
      '必须使用 stream.pipeline 或严格监听 write() 返回的 boolean 值与 drain 事件，杜绝大文件读取快于写入导致的 Buffer 爆满 OOM。',
    skeletonTemplate: `const fs = require('fs');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');

async function processBigFile(sourcePath, destPath) {
  try {
    await pipeline(
      fs.createReadStream(sourcePath),
      zlib.createGzip(),
      fs.createWriteStream(destPath)
    );
    console.log('流式传输与压缩完成，内存占用恒定 < 30MB');
  } catch (err) {
    console.error('流水线异常中止，句柄已自动安全释放:', err);
  }
}`,
    mustHaveFeatures: ['pipeline', 'createReadStream', 'createWriteStream'],
    pitfalls:
      '直接使用 readable.on("data", chunk => writable.write(chunk)) 不判断 false 会导致上百兆数据滞留在内存在堆内存中堆积，瞬间打爆 Node.js 1.4GB 堆上限。',
    sourceAuthority: 'Node.js 官方文档：Stream Backpressure Mechanism',
  },
  {
    chunkId: 'be_redis_double_delete_03',
    domain: 'backend',
    title: 'Redis 缓存与 MySQL 数据库一致性：延时双删与最终一致方案',
    language: 'go',
    frameworkVersion: '通用架构',
    keywords: [
      'redis',
      'mysql',
      '缓存一致性',
      '延时双删',
      '缓存击穿',
      'canal',
      'binlog',
    ],
    apiContract:
      '必须解释“先写库还是先删缓存”的并发脏读时序，给出先更新数据库 -> 再删除缓存（Cache-Aside），或延时双删的具体实现步骤。',
    skeletonTemplate: `func UpdateData(key string, data Value) error {
    // 1. 先删缓存，防并发读旧值
    redis.Del(key)

    // 2. 更新数据库
    err := db.Update(data)
    if err != nil {
        return err
    }

    // 3. 延时再次删除缓存（确保主从同步完成前读取的脏数据被再次清除）
    go func() {
        time.Sleep(500 * time.Millisecond)
        redis.Del(key)
    }()

    return nil
}`,
    mustHaveFeatures: ['Del', 'Update', 'Sleep', 'redis'],
    pitfalls:
      '延时删除的时间必须略大于业务中一次读取 + 写入缓存的时间与主从复制网络延迟之和，否则第 2 次删除可能先于脏数据写入缓存发生。',
    sourceAuthority: '分布式系统设计模式：Cache-Aside Pattern',
  },
  {
    chunkId: 'be_jwt_double_token_04',
    domain: 'backend',
    title: 'JWT 生产级双 Token（AccessToken + RefreshToken）无感刷新鉴权架构',
    language: 'typescript',
    frameworkVersion: 'Node.js / Go / 通用',
    keywords: [
      'jwt',
      'token',
      'accesstoken',
      'refreshtoken',
      '无感刷新',
      '鉴权',
      '401拦截器',
      'axios拦截器',
    ],
    apiContract:
      '必须采用短生命周期的 AccessToken（如 15 分钟）搭配长生命周期的 RefreshToken（如 7 天），前端拦截器在收到 401 时队列挂起并发请求并利用 RefreshToken 换取新令牌后重试。',
    skeletonTemplate: `// 前端 Axios 401 无感刷新拦截器范式
let isRefreshing = false;
let retryQueue = [];

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 挂起并发请求，等待刷新完成后统一重放
        return new Promise((resolve) => {
          retryQueue.push((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            resolve(axios(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken: getLocalRefreshToken()
        });
        const newAccessToken = data.accessToken;
        setLocalAccessToken(newAccessToken);
        
        // 消费队列重试
        retryQueue.forEach((callback) => callback(newAccessToken));
        retryQueue = [];

        originalRequest.headers.Authorization = 'Bearer ' + newAccessToken;
        return axios(originalRequest);
      } catch (refreshErr) {
        logoutUser();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);`,
    mustHaveFeatures: ['accessToken', 'refreshToken', 'isRefreshing', 'retryQueue', '401'],
    pitfalls:
      '若不使用 retryQueue 队列拦截并发请求，当页面同时发起 5 个请求且 Token 过期时，会连续触发 5 次 refresh 接口换取，引发服务端 Token 竞争失效或封禁。',
    sourceAuthority: 'RFC 6749 OAuth 2.0 Token Refresh Specification',
  },
  {
    chunkId: 'be_mysql_index_leftmost_05',
    domain: 'backend',
    title: 'MySQL B+ 树最左前缀原则、复合索引失效根因与 Explain 分析',
    language: 'sql',
    frameworkVersion: 'MySQL 5.7 / 8.0',
    keywords: [
      'mysql',
      '索引',
      '最左前缀',
      'explain',
      '慢查询',
      'b+树',
      '索引下推',
      'type ref',
      'type all',
    ],
    apiContract:
      '必须说明复合索引 (a, b, c) 在 B+ 树中是先按 a 排序，a 相同时再按 b 排序的物理存储原理；列举跳过 a 查 b、范围查询截断、在索引列使用函数导致全表扫描的规避方案。',
    skeletonTemplate: `-- 建立复合索引: idx_a_b_c (a, b, c)
CREATE INDEX idx_a_b_c ON orders(user_id, status, created_at);

-- ✅ 完美命中索引 (type: ref, key: idx_a_b_c)
EXPLAIN SELECT * FROM orders WHERE user_id = 1001 AND status = 1 AND created_at >= '2026-01-01';

-- ⚠️ 范围查询导致后续列索引失效 (status 被截断，仅命中 user_id)
EXPLAIN SELECT * FROM orders WHERE user_id > 1000 AND status = 1;

-- ❌ 索引彻底失效导致全表扫描 (跳过引导列 user_id)
EXPLAIN SELECT * FROM orders WHERE status = 1;

-- ❌ 索引列使用内置函数导致无法走树查找
EXPLAIN SELECT * FROM orders WHERE DATE(created_at) = '2026-01-01';`,
    mustHaveFeatures: ['EXPLAIN', 'INDEX', 'WHERE', 'idx_a_b_c'],
    pitfalls:
      '在复合索引中，一旦某个列使用了范围查询（>、<、between、like "xxx%"），该列右侧的所有索引列将无法用于索引树快速过滤，只能走索引下推（ICP）或回表过滤。',
    sourceAuthority: 'High Performance MySQL (高性能 MySQL 经典规范)',
  },
  {
    chunkId: 'be_redis_distributed_lock_06',
    domain: 'backend',
    title: 'Redis 分布式锁生产级标准实现：SET NX PX 与 Lua 脚本原子释放',
    language: 'lua',
    frameworkVersion: 'Redis 2.6+',
    keywords: [
      'redis',
      '分布式锁',
      'setnx',
      'lua脚本',
      '原子性',
      'redlock',
      '锁超时',
      '防误删',
    ],
    apiContract:
      '必须使用 SET key unique_value NX PX 毫秒数 实现原子加锁，释放锁时必须使用 Lua 脚本先校验唯一值是否匹配再执行 DEL，严禁直接 DEL 误删其他线程的锁。',
    skeletonTemplate: `-- 1. 客户端加锁命令 (单条原子指令)
-- SET resource_lock "uuid_client_01" NX PX 30000

-- 2. 释放锁的 Lua 脚本 (原子执行: 校验锁归属 -> 删除)
local lockKey = KEYS[1]
local expectedValue = ARGV[1]

-- 只有当前锁存储的值与发起请求的唯一身份标识一致时才允许删除
if redis.call("get", lockKey) == expectedValue then
    return redis.call("del", lockKey)
else
    return 0
end`,
    mustHaveFeatures: ['KEYS[1]', 'ARGV[1]', 'redis.call', 'get', 'del'],
    pitfalls:
      '若直接使用 del key 释放锁：当业务耗时超出锁超时时间（锁自动释放），被其他线程抢占后，原线程执行完业务会直接误删新线程的锁，导致并发保护彻底击穿。',
    sourceAuthority: 'Redis 官方文档：Distributed Locks with Redis',
  },
  {
    chunkId: 'be_python_asyncio_gil_07',
    domain: 'backend',
    title: 'Python 异步编程 asyncio 与突破 GIL（全局解释器锁）并发实战',
    language: 'python',
    frameworkVersion: 'Python 3.8+',
    keywords: [
      'python',
      'asyncio',
      'gil',
      '协程',
      '多线程',
      '多进程',
      'ProcessPoolExecutor',
      'ThreadPoolExecutor',
    ],
    apiContract:
      '必须明确指出 Python GIL 限制单进程同一时刻只能执行一个字节码线程；对于 I/O 密集型采用 asyncio 或多线程，对于 CPU 计算密集型必须使用 ProcessPoolExecutor 多进程或 C 扩展释放 GIL。',
    skeletonTemplate: `import asyncio
import concurrent.futures
import time

def cpu_heavy_task(n):
    # CPU 密集型任务，受 GIL 限制，必须用独立进程跑在多核上
    return sum(i * i for i in range(n))

async def main():
    loop = asyncio.get_running_loop()

    # 1. I/O 密集型异步并发 (单线程协程搞定上万并发)
    async def fetch_api(idx):
        await asyncio.sleep(0.1)
        return f"api_{idx}"

    io_results = await asyncio.gather(*(fetch_api(i) for i in range(5)))
    print("I/O 结果:", io_results)

    # 2. CPU 密集型任务投递到进程池，绕开 GIL 跑满多核 CPU
    with concurrent.futures.ProcessPoolExecutor() as process_pool:
        cpu_result = await loop.run_in_executor(process_pool, cpu_heavy_task, 10_000_000)
        print("CPU 密集型计算完成:", cpu_result)

if __name__ == '__main__':
    asyncio.run(main())`,
    mustHaveFeatures: ['asyncio', 'ProcessPoolExecutor', 'run_in_executor', 'gather'],
    pitfalls:
      '在 asyncio 中直接写耗时死循环或 time.sleep() 会彻底阻塞事件循环线程，导致后续所有异步协程全部饥饿挂死，必须用 run_in_executor 移交独立线程/进程。',
    sourceAuthority: 'Python 官方文档：asyncio Coroutines and Tasks',
  },
];
