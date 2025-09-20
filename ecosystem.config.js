module.exports = {
  apps: [{
    name: 'api-prod',
    script: 'dist/main.js',
    instances: 'max',           // Use all CPU cores
    max_memory_restart: '1G',   // Auto-restart if memory exceeds 1GB
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=2048' // 2GB memory limit
    },
    node_args: [
      '--optimize-for-size',
      '--gc-interval=100',
      '--max-semi-space-size=128'
    ]
  }]
};