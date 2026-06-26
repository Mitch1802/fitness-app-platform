import proxyConfig from './proxy-target.json';

declare const APP_VERSION: string;

export const environment = {
  production: false,
  apiUrl: "/api/v1/",
  proxyTarget: proxyConfig.proxyTarget,
  title: "FitTrack (DEV)",
  version: APP_VERSION,
};
