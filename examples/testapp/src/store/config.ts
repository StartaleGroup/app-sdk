// import latestPkgJson from '@base-org/account/package.json';

export const SELECTED_SDK_KEY = 'selected_sdk_version';
export const sdkVersions = ['HEAD'] as const;
export type SDKVersionType = (typeof sdkVersions)[number];

export const SELECTED_SCW_URL_KEY = 'scw_url';
export const scwUrls = [
    'https://keys.coinbase.com/connect',
    'http://localhost:3000/',
    'http://localhost:5174/',
] as const;
export type ScwUrlType = (typeof scwUrls)[number];
