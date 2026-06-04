const fs = require('fs');
let content = fs.readFileSync('c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts', 'utf8');

// The template literals are currently like `${}`
// We know from the source that it should be `${currentYearStr}` for license and trade license
content = content.replace(/licenseNumber:\s*`LN-\$\{([^}]*)\}-0888`/g, 'licenseNumber: `LN-${currentYearStr}-0888`');
content = content.replace(/tradeLicense:\s*`TL-30155-\$\{([^}]*)\}`/g, 'tradeLicense: `TL-30155-${currentYearStr}`');

// For contractor 2:
content = content.replace(/licenseNumber:\s*`LN-\$\{([^}]*)\}-0999`/g, 'licenseNumber: `LN-${currentYearStr}-0999`');
content = content.replace(/tradeLicense:\s*`TL-40277-\$\{([^}]*)\}`/g, 'tradeLicense: `TL-40277-${currentYearStr}`');

// Contractor 3:
content = content.replace(/licenseNumber:\s*`LN-\$\{([^}]*)\}-1100`/g, 'licenseNumber: `LN-${currentYearStr}-1100`');
content = content.replace(/tradeLicense:\s*`TL-50312-\$\{([^}]*)\}`/g, 'tradeLicense: `TL-50312-${currentYearStr}`');

// Contractor 4:
content = content.replace(/licenseNumber:\s*`LN-\$\{([^}]*)\}-1200`/g, 'licenseNumber: `LN-${currentYearStr}-1200`');
content = content.replace(/tradeLicense:\s*`TL-60420-\$\{([^}]*)\}`/g, 'tradeLicense: `TL-60420-${currentYearStr}`');

// Contractor 5:
content = content.replace(/licenseNumber:\s*`LN-\$\{([^}]*)\}-1300`/g, 'licenseNumber: `LN-${currentYearStr}-1300`');
content = content.replace(/tradeLicense:\s*`TL-70580-\$\{([^}]*)\}`/g, 'tradeLicense: `TL-70580-${currentYearStr}`');

// General catch-all for any other empty `${}`
content = content.replace(/\$\{\}/g, '${currentYearStr}');

fs.writeFileSync('c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts', content, 'utf8');
console.log('Fixed empty template literals');
