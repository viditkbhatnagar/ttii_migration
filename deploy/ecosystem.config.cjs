// PM2 ecosystem config for TTII LMS API
// Usage on new droplet:
//   cd /opt/ttii-lms
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save
//   pm2 startup   # follow printed instructions
module.exports = {
  apps: [
    {
      name: "ttii-api",
      script: "apps/api/dist/index.js",
      cwd: "/opt/ttii-lms",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      watch: false,
      max_memory_restart: "1G",
      // Node 20.6+ loads this file into process.env before the app starts.
      // The app reads process.env directly (no dotenv in deps).
      node_args: ["--env-file=/opt/ttii-lms/.env"],
      env: {
        NODE_ENV: "production",
      },
      out_file: "/var/log/ttii-lms/api.out.log",
      error_file: "/var/log/ttii-lms/api.err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
