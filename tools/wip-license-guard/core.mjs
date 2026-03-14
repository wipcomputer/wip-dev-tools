// wip-license-guard/core.mjs
// License generation and validation logic.

export function generateLicense(config) {
  const { copyright, license, year } = config;

  if (license === 'MIT') return generateMIT(copyright, year);
  if (license === 'AGPL-3.0') return generateAGPL(copyright, year);
  if (license === 'MIT+AGPL') return generateDual(copyright, year);

  return generateMIT(copyright, year);
}

function generateMIT(copyright, year) {
  return `MIT License

Copyright (c) ${year} ${copyright}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function generateAGPL(copyright, year) {
  return `GNU Affero General Public License v3.0

Copyright (c) ${year} ${copyright}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
`;
}

function generateDual(copyright, year) {
  return `Dual License: MIT + AGPLv3

Copyright (c) ${year} ${copyright}


1. MIT License (local and personal use)
---------------------------------------

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


2. GNU Affero General Public License v3.0 (commercial and cloud use)
--------------------------------------------------------------------

If you run this software as part of a hosted service, cloud platform,
marketplace listing, or any network-accessible offering for commercial
purposes, the AGPLv3 terms apply. You must either:

  a) Release your complete source code under AGPLv3, or
  b) Obtain a commercial license.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.


AGPLv3 for personal use is free. Commercial licenses available.
`;
}

export function generateReadmeBlock(config) {
  const { license, attribution } = config;

  if (license === 'MIT') {
    return `## License

MIT.${attribution ? ' ' + attribution : ''}
`;
  }

  if (license === 'AGPL-3.0') {
    return `## License

AGPLv3. AGPLv3 for personal use is free.${attribution ? '\n\n' + attribution : ''}
`;
  }

  return `## License

Dual-license model designed to keep tools free while preventing commercial resellers.

\`\`\`
MIT      All CLI tools, MCP servers, skills, and hooks (use anywhere, no restrictions).
AGPLv3   Commercial redistribution, marketplace listings, or bundling into paid services.
\`\`\`

AGPLv3 for personal use is free. Commercial licenses available.

### Can I use this?

**Yes, freely:**
- Use any tool locally or on your own servers
- Modify the code for your own projects
- Include in your internal CI/CD pipelines
- Fork it and send us feedback via PRs (we'd love that)

**Need a commercial license:**
- Bundle into a product you sell
- List on a marketplace (VS Code, JetBrains, etc.)
- Offer as part of a hosted/SaaS platform
- Redistribute commercially

Using these tools to build your own software is fine. Reselling the tools themselves is what requires a commercial license.

By submitting a PR, you agree to the [Contributor License Agreement](CLA.md).
${attribution ? '\n' + attribution : ''}`;
}

/**
 * Replace ## License section in readme content.
 * If no ## License exists, appends the block at the end.
 * Returns the updated content.
 */
export function replaceReadmeLicenseSection(content, config) {
  const block = generateReadmeBlock(config);

  // Match from "## License" to the next ## heading or end of file
  const licenseRegex = /## License[\s\S]*?(?=\n## [^#]|\n---\s*$|$)/;
  if (licenseRegex.test(content)) {
    return content.replace(licenseRegex, block.trimEnd());
  }

  // No license section found, append
  return content.trimEnd() + '\n\n' + block;
}

/**
 * Remove ## License section from content (for sub-tool READMEs).
 * Returns the updated content.
 */
export function removeReadmeLicenseSection(content) {
  // Match from "## License" to the next ## heading or end of file
  const licenseRegex = /\n## License[\s\S]*?(?=\n## [^#]|$)/;
  return content.replace(licenseRegex, '').trimEnd() + '\n';
}
