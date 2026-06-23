const fs = require('fs');
const buf = fs.readFileSync('C:/Users/HP/OneDrive/Desktop/Projet1/myapp/src/App.tsx');
console.log('first 10 bytes hex:', buf.slice(0, 10).toString('hex'));
console.log('first char code:', buf[0], buf[1]);
