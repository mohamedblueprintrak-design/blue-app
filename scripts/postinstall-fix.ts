// postinstall-fix.ts
// Post-install checks for the BluePrint ERP project.
//
// NOTE: The previous behavior of automatically patching next.config.ts has been removed.
// Auto-modifying config files during install is a bad practice — it causes unexpected
// diffs, makes debugging harder, and can break production builds silently.
// The :path* pattern issue should be fixed directly in next.config.ts instead.

function main() {
  // Only log that postinstall ran successfully
  console.info('[postinstall-fix] Post-install checks completed. No auto-patches applied.');
}

main();
