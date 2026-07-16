const sharp = require('sharp');
sharp('scratchpad/logo-preview.png').raw().toBuffer({resolveWithObject:true}).then(({data,info})=>{
  const px = (x,y)=>{const i=(y*info.width+x)*info.channels; return '#'+[0,1,2].map(k=>data[i+k].toString(16).padStart(2,'0')).join('')+' a='+data[i+3];};
  console.log('bg corner-ish(30,256):', px(30,256));
  console.log('bg top(256,30):', px(256,30));
  console.log('basket white(256,300):', px(256,300));
  console.log('outside(2,2):', px(2,2));
});
