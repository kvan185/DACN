const fs = require('fs');
const path = require('path');

function replaceStorage(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceStorage(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let o = fs.readFileSync(fullPath, 'utf8');
            let n = o.replace(/localStorage\.setItem\('guestCart'/g, "sessionStorage.setItem('guestCart'");
            n = n.replace(/localStorage\.getItem\('guestCart'/g, "sessionStorage.getItem('guestCart'");
            n = n.replace(/localStorage\.removeItem\('guestCart'/g, "sessionStorage.removeItem('guestCart'");

            n = n.replace(/localStorage\.setItem\('guest_session'/g, "sessionStorage.setItem('guest_session'");
            n = n.replace(/localStorage\.getItem\('guest_session'/g, "sessionStorage.getItem('guest_session'");
            n = n.replace(/localStorage\.removeItem\('guest_session'/g, "sessionStorage.removeItem('guest_session'");

            n = n.replace(/localStorage\.setItem\('tableNumber'/g, "sessionStorage.setItem('tableNumber'");
            n = n.replace(/localStorage\.getItem\('tableNumber'/g, "sessionStorage.getItem('tableNumber'");
            n = n.replace(/localStorage\.removeItem\('tableNumber'/g, "sessionStorage.removeItem('tableNumber'");

            n = n.replace(/localStorage\.setItem\('orderSource'/g, "sessionStorage.setItem('orderSource'");
            n = n.replace(/localStorage\.getItem\('orderSource'/g, "sessionStorage.getItem('orderSource'");
            n = n.replace(/localStorage\.removeItem\('orderSource'/g, "sessionStorage.removeItem('orderSource'");

            if (o !== n) {
                fs.writeFileSync(fullPath, n);
                console.log('Updated', fullPath);
            }
        }
    });
}
replaceStorage('frontend/src');
