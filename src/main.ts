import '@fluentui/web-components/avatar/define.js';
import '@fluentui/web-components/button/define.js';
import '@fluentui/web-components/text-input/define.js';
import '@fluentui/web-components/checkbox/define.js';
import '@fluentui/web-components/dropdown/define.js';
import '@fluentui/web-components/listbox/define.js';
import '@fluentui/web-components/option/define.js';
import '@fluentui/web-components/tab/define.js';
import '@fluentui/web-components/tablist/define.js';
import '@fluentui/web-components/spinner/define.js';
import { setTheme } from '@fluentui/web-components/theme/set-theme.js';
import { teamsLightTheme } from '@fluentui/tokens';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

setTheme(teamsLightTheme);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
