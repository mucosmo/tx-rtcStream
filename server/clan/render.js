const fs = require('fs');
const input = '/opt/application/tx-rtcStream/server/clan/input.txt';


setInterval(() => {
    fs.writeFileSync(input, Date.now().toString(), 'utf8');
    
}, 100);