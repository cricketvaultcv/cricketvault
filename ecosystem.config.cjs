/**
 * PM2 configuration for the CricketVault API.
 * The React client is served directly by Nginx from client/dist.
 */
module.exports = {
  apps: [
    {
      name: "cricketvault-api",
      cwd: __dirname,
      script: "server/dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "350M",
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      error_file: "/var/log/cricketvault/api-error.log",
      out_file: "/var/log/cricketvault/api-out.log",
      time: true,
      merge_logs: true,
    },
  ],
};
