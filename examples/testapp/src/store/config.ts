// import latestPkgJson from '@startale/app-sdk/package.json';

export const SELECTED_SDK_KEY = 'selected_sdk_version';
export const sdkVersions = ['HEAD'] as const;
export type SDKVersionType = (typeof sdkVersions)[number];

export const SELECTED_SCW_URL_KEY = 'scw_url';
export const scwUrls = [
  'https://deploy-sub-account-poc-for-yoake-sa-228.d3qb16qon2uoic.amplifyapp.com',
  'http://localhost:3000/',
] as const;
export type ScwUrlType = (typeof scwUrls)[number];
