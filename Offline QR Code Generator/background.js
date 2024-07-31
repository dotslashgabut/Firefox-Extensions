browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "savePNG") {
    const svgString = message.svgString;
    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const size = img.width;
      const borderSize = Math.floor(size * 0.1);
      canvas.width = size + 2 * borderSize;
      canvas.height = size + 2 * borderSize;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, borderSize, borderSize);
      
      canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        browser.downloads.download({
          url: url,
          filename: 'qrcode.png',
          saveAs: true
        }).then(() => {
          URL.revokeObjectURL(url);
          URL.revokeObjectURL(svgUrl);
          sendResponse({success: true});
        }).catch(error => {
          console.error('Download failed:', error);
          sendResponse({success: false, error: error.toString()});
        });
      }, 'image/png');
    };
    img.onerror = function() {
      sendResponse({success: false, error: "Failed to load SVG"});
    };
    img.src = svgUrl;
    
    return true; // Indicates that we will send a response asynchronously
  }
});

browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { action: "getPageUrl" });
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setPageUrl") {
    browser.storage.local.set({ currentUrl: request.url });
  }
});