module.exports = {
  apps: [
    {
      name: 'exam-system',
      script: './dist/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      // 重启策略
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      // 优雅退出：先发 SIGINT，30 秒后强制 SIGKILL
      kill_timeout: 30000,
      listen_timeout: 10000,
    },
  ],
}
