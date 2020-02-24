import { BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import { findTab } from '../ui/tab-manager'

// TEMPORARY: hyperdrive.network is trusted
const INTERNAL_ORIGIN_REGEX = /^(beaker:|https?:\/\/(.*\.)?hyperdrive\.network(:|\/))/i
const SITE_ORIGIN_REGEX = /^(beaker:|hyper:|https?:|data:)/i
const IFRAME_WHITELIST = [
  'hyperdrive.loadDrive',
  'hyperdrive.getInfo',
  'hyperdrive.diff',
  'hyperdrive.stat',
  'hyperdrive.readFile',
  'hyperdrive.readdir',
  'hyperdrive.query',
  'hyperdrive.watch',
  'hyperdrive.resolveName'
]

// internal manifests
import loggerManifest from './manifests/internal/logger'
import drivesManifest from './manifests/internal/drives'
import beakerBrowserManifest from './manifests/internal/browser'
import bookmarksManifest from './manifests/internal/bookmarks'
import downloadsManifest from './manifests/internal/downloads'
import historyManifest from './manifests/internal/history'
import sitedataManifest from './manifests/internal/sitedata'
import watchlistManifest from './manifests/internal/watchlist'

// internal apis
import { WEBAPI as loggerAPI } from '../logger'
import * as auditLog from '../dbs/audit-log'
import drivesAPI from './bg/drives'
import * as bookmarksAPI from '../filesystem/bookmarks'
import historyAPI from './bg/history'
import { WEBAPI as sitedataAPI } from '../dbs/sitedata'
import watchlistAPI from './bg/watchlist'
import { WEBAPI as downloadsAPI } from '../ui/downloads'
import { WEBAPI as beakerBrowserAPI } from '../browser'

// external manifests
import navigatorManifest from './manifests/external/navigator'
import navigatorSessionManifest from './manifests/external/navigator-session'
import navigatorFilesystemManifest from './manifests/external/navigator-filesystem'
import hyperdriveManifest from './manifests/external/hyperdrive'
import spellCheckerManifest from './manifests/external/spell-checker'

// external apis
import navigatorAPI from './bg/navigator'
import navigatorSessionAPI from './bg/navigator-session'
import navigatorFilesystemAPI from './bg/navigator-filesystem'
import hyperdriveAPI from './bg/hyperdrive'
import * as spellCheckerAPI from './bg/spell-checker'

// experimental manifests
import experimentalCapturePageManifest from './manifests/external/experimental/capture-page'
import experimentalDatPeersManifest from './manifests/external/experimental/dat-peers'
import experimentalGlobalFetchManifest from './manifests/external/experimental/global-fetch'

// experimental apis
import experimentalCapturePageAPI from './bg/experimental/capture-page'
import experimentalDatPeersAPI from './bg/experimental/dat-peers'
import experimentalGlobalFetchAPI from './bg/experimental/global-fetch'

// exported api
// =

export const setup = function () {
  // internal apis
  rpc.exportAPI('logger', loggerManifest, Object.assign({}, {listAuditLog: auditLog.list, streamAuditLog: auditLog.stream}, loggerAPI), internalOnly)
  rpc.exportAPI('beaker-browser', beakerBrowserManifest, beakerBrowserAPI, internalOnly)
  rpc.exportAPI('bookmarks', bookmarksManifest, bookmarksAPI, internalOnly)
  rpc.exportAPI('downloads', downloadsManifest, downloadsAPI, internalOnly)
  rpc.exportAPI('drives', drivesManifest, drivesAPI, internalOnly)
  rpc.exportAPI('history', historyManifest, historyAPI, internalOnly)
  rpc.exportAPI('sitedata', sitedataManifest, sitedataAPI, internalOnly)
  rpc.exportAPI('watchlist', watchlistManifest, watchlistAPI, internalOnly)

  // external apis
  rpc.exportAPI('navigator', navigatorManifest, navigatorAPI, secureOnly('navigator'))
  rpc.exportAPI('navigator-session', navigatorSessionManifest, navigatorSessionAPI, secureOnly('navigator-session'))
  rpc.exportAPI('navigator-filesystem', navigatorFilesystemManifest, navigatorFilesystemAPI, secureOnly('navigator-filesystem'))
  rpc.exportAPI('hyperdrive', hyperdriveManifest, hyperdriveAPI, secureOnly('hyperdrive'))
  // rpc.exportAPI('spell-checker', spellCheckerManifest, spellCheckerAPI) TODO

  // experimental apis
  rpc.exportAPI('experimental-capture-page', experimentalCapturePageManifest, experimentalCapturePageAPI, secureOnly)
  rpc.exportAPI('experimental-dat-peers', experimentalDatPeersManifest, experimentalDatPeersAPI, secureOnly)
  rpc.exportAPI('experimental-global-fetch', experimentalGlobalFetchManifest, experimentalGlobalFetchAPI, secureOnly)
}

function internalOnly (event, methodName, args) {
  if (!(event && event.sender)) {
    return false
  }
  var senderInfo = getSenderInfo(event)
  return senderInfo.isMainFrame && INTERNAL_ORIGIN_REGEX.test(senderInfo.url)
}

const secureOnly = apiName => (event, methodName, args) => {
  if (!(event && event.sender)) {
    return false
  }
  var senderInfo = getSenderInfo(event)
  if (!SITE_ORIGIN_REGEX.test(senderInfo.url)) {
    return false
  }
  if (!senderInfo.isMainFrame) {
    return IFRAME_WHITELIST.includes(`${apiName}.${methodName}`)
  }
  return true
}

function getSenderInfo (event) {
  var view = BrowserView.fromWebContents(event.sender)
  var tab = (view) ? findTab(view) : undefined
  if (tab) return tab.getIPCSenderInfo(event)
  return {isMainFrame: true, url: event.sender.getURL()}
}