/**
 * ============================================================
 *  I Ching Oracle Library - Main Export
 * ============================================================
 * 
 *  General-purpose library modules for Daoist diagram rendering,
 *  Bagua calculations, and FDL (Fulu Drawing Language) processing.
 * 
 *  Usage:
 *    import { FDLCore, BaguaCore, FDLRenderer, FDLIntegration } from './lib/index.js';
 *    // or for global usage:
 *    const { FDLCore, BaguaCore } = window.IChingLib;
 */

'use strict';

// Core modules
// These are loaded via script tags in the HTML, so we just reference them
const LibExports = {
  // FDL (Fulu Drawing Language)
  get FDLCore() { return window.FDLCore; },
  get FDLRenderer() { return window.FDLRenderer; },
  get FDLIntegration() { return window.FDLIntegration; },
  
  // Bagua
  get BaguaCore() { return window.BaguaCore; },
  
  // Utilities
  get FDLUtils() { return window.FDLCore?.FDLUtils; },
  get FDLValidator() { return window.FDLCore?.FDLValidator; },
  get FDLSpec() { return window.FDLCore?.FDLSpec; }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LibExports;
} else {
  window.IChingLib = LibExports;
}
