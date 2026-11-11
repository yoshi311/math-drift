import { route, start } from './router.js';
import { state } from './state.js';
import { toast } from './util.js';
import { titleScreen, homeScreen } from './screens/home.js';
import { mapScreen, chapterScreen } from './screens/map.js';
import { stepScreen, battleScreen } from './screens/step.js';
import { pitScreen, pitSingle, notesScreen, maintScreen } from './screens/pit.js';
import { attackScreen } from './screens/attack.js';
import { garageScreen, dealerScreen } from './screens/garage.js';
import { recordsScreen, settingsScreen, applySettings } from './screens/misc.js';

applySettings();

route('/', (app) => state.profile.started ? homeScreen(app) : titleScreen(app));
route('/title', titleScreen);
route('/home', homeScreen);
route('/map', mapScreen);
route('/chapter/:id', chapterScreen);
route('/step/:id', stepScreen);
route('/battle/:id', battleScreen);
route('/pit', pitScreen);
route('/pit/p/:pid', pitSingle);
route('/maint', maintScreen);
route('/attack', attackScreen);
route('/notes', notesScreen);
route('/garage', garageScreen);
route('/dealer', dealerScreen);
route('/records', recordsScreen);
route('/settings', settingsScreen);

start();

window.addEventListener('save-error', () => toast('⚠ 保存容量がいっぱいです。設定からバックアップを取り、不要なメモを消してください'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
