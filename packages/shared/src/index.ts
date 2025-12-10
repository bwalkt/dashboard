export * from './math/index.js'
export * from './mock/data-table.js'
export * from './phone/index.js'
export * from './pzero/index.js'
export * from './types/index.js'
export * from './utils/functionHeader.js'
export * from './utils/functionShorthand.js'
export * from './utils/gridShorthand.js'
// Note: handle utilities are exported via pzero/users.js and pzero/orgs.js to avoid conflicts
export {
  generateDeviceNicknameFromName,
  generateEmailHandle,
  generateHandle,
  generateHandleFromEmail,
  generateHandleFromName,
  generateOrgHandle,
  generateUserHandle,
  type HandleOptions,
  isValidHandle,
  suggestAlternativeHandles,
} from './utils/handles.js'
export * from './validator/index.js'
