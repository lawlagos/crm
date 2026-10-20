import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',testIgnore:'**/pwa.spec.ts',fullyParallel:false,workers:1,timeout:45_000,
 outputDir:'./test-results/local',
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:900}}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
 webServer:{command:'npx tsx scripts/e2e-server.ts',url:'http://127.0.0.1:3100/api/health',reuseExistingServer:false,timeout:120_000},
 reporter:[['list'],['html',{open:'never'}]],
});
