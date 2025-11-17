module.exports = {
  apps: [
    {
      name: 'dig',
      script: 'dist/server/index.js',
      cwd: '/opt/DIG',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=6144'
      },
      error_file: './logs/dig-error.log',
      out_file: './logs/dig-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '4G', // Increased to match Node.js heap size (6GB) with buffer
      watch: false
    }
  ]
};

