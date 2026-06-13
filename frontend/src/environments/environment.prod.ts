import proxyConfig from './proxy-target.json';

export const environment = {
  production: true,
  apiUrl: "/api/v1/",
  proxyTarget: proxyConfig.proxyTarget,
  title: "FitTrack"
};
