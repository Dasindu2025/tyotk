// PM2 Configuration for TyoTrack
module.exports = {
  apps: [{
    name: 'tyotrack',
    script: '.next/standalone/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s',
    autorestart: true,
    watch: false,
  }]
}
