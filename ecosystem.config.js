module.exports = {
  apps: [
    {
      name: 'fpp-control',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-fpp-control-error.log',
      out_file: './logs/pm2-fpp-control-out.log',
      log_file: './logs/pm2-fpp-control-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'fpp-poller',
      script: './lib/fpp-poller.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        FPP_POLL_INTERVAL: '10000' // Poll every 10 seconds
      },
      error_file: './logs/pm2-fpp-poller-error.log',
      out_file: './logs/pm2-fpp-poller-out.log',
      log_file: './logs/pm2-fpp-poller-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'update-daemon',
      script: './scripts/update-daemon.sh',
      interpreter: 'bash',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-update-daemon-error.log',
      out_file: './logs/pm2-update-daemon-out.log',
      log_file: './logs/pm2-update-daemon-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
