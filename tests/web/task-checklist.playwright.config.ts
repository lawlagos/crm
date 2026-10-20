import{defineConfig}from'@playwright/test';
import base from'./playwright.config';
export default defineConfig({...base,testMatch:'task-checklist.spec.ts',outputDir:'../../test-results/task-checklist',use:{...base.use,baseURL:'http://127.0.0.1:4176/crm/'},webServer:{...(base.webServer as object),command:'npx vite --config vite.config.mts --host 127.0.0.1 --port 4176 --strictPort',url:'http://127.0.0.1:4176/crm/',reuseExistingServer:false}});
