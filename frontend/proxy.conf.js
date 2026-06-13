const { proxyTarget } = require('./src/environments/proxy-target.json');

module.exports = [
  {
    context: ['/api'],
    target: proxyTarget,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
];