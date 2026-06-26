import proxyConfig from './proxy-target.json';

declare const APP_VERSION: string;

export const environment = {
  production: true,
  apiUrl: "/api/v1/",
  proxyTarget: proxyConfig.proxyTarget,
  title: "FitTrack",
  version: APP_VERSION,
};
