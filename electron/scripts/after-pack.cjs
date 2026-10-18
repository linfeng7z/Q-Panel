'use strict'

const { execFileSync } = require('node:child_process')
const path = require('node:path')

/**
 * electron-builder skips signing when identity is null. Ad-hoc sign the bundle
 * after packing so macOS binds the Info.plist/bundle id to the app, which is
 * required before Notification Center will register Q-Panel.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)
  execFileSync(
    'codesign',
    ['--force', '--deep', '--sign', '-', '--identifier', context.packager.appInfo.id, appPath],
    { stdio: 'inherit' },
  )
}
