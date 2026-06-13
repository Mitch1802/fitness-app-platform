import proxyConfig from './proxy-target.json';

export const environment = {
  production: false,
  apiUrl: "/api/v1/",
  proxyTarget: proxyConfig.proxyTarget,
  title: "FitTrack (DEV)"
};
