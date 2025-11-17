// PM2 configuration for Traccar Backend
// This prevents constant restarts while still allowing recovery from failures
module.exports = {
  apps: [{
    name: 'traccar-backend',
    script: './start.sh',
    interpreter: 'bash',
    cwd: '/opt/DIG/traccar-backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    kill_timeout: 10000,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    exp_backoff_restart_delay: 100,
    error_file: './logs/traccar-backend-error.log',
    out_file: './logs/traccar-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

