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

\`\`\`
MIT      All CLI tools, MCP servers, skills, and hooks (use anywhere, no restrictions).
AGPLv3   Commercial redistribution, marketplace listings, or bundling into paid services.
\`\`\`

AGPLv3 for personal use is free. Commercial licenses available.
${attribution ? '\n' + attribution : ''}`;
}
