const sharp = require('sharp');
const fs = require('fs');
const buf = fs.readFileSync('assets/logo.svg');
sharp(buf, { density: 300 })
  .resize(512, 512, { fit: 'contain', background: { r:255,g:255,b:255,alpha:0 } })
  .png()
  .toFile('scratchpad/logo-preview.png')
  .then(i => console.log('ok', JSON.stringify(i)))
  .catch(e => console.error('ERR', e.message));
