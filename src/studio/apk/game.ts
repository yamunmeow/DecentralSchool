import type { AppInfo, Game } from "../../shared/types";
import { pageFor } from "../exporting";
import { buildApk, defaultAppId, makeIcon } from "./build";
import { getSigningKey, loadStored } from "./keys";

/**
 * A quick game as a signed Android app, in the browser. The same app id with the next
 * version code installs as an update over the copy students already have.
 */
export async function gameApk(game: Game, opts: { name?: string; appId?: string } = {}): Promise<{ blob: Blob; app: AppInfo; newKey: boolean }> {
  const id = opts.appId || game.app?.id || defaultAppId(game);
  const versionCode = game.app && game.app.id === id ? game.app.versionCode + 1 : 1;
  const version = `1.${versionCode}`;
  const newKey = !(await loadStored());
  const key = await getSigningKey();
  const blob = await buildApk(await makeIcon(game), pageFor(game), { id, name: (opts.name || game.title).trim() || game.title, version, versionCode, keepScreenOn: game.template === "custom" }, key);
  return { blob, app: { id, version, versionCode }, newKey };
}
