// Powertools Logger writes straight to stdout, bypassing Jest's --silent.
// Set before any module creates a Logger.
process.env.POWERTOOLS_LOG_LEVEL = 'SILENT';
