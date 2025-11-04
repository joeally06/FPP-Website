module.exports = {
  apps: [{
    name: 'fpp-control',
    script: 'npm',
    args: 'start',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '~/.pm2/logs/fpp-control-error.log',
    out_file: '~/.pm2/logs/fpp-control-out.log',
    log_file: '~/.pm2/logs/fpp-control-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
