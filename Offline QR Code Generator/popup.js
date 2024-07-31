document.addEventListener('DOMContentLoaded', function() {
  const dataTypeSelect = document.getElementById('dataType');
  const inputFields = document.getElementById('inputFields');
  const errorMessage = document.getElementById('errorMessage');
  const generateButton = document.getElementById('generate');
  const qrcodeDiv = document.getElementById('qrcode');
  const qrPreview = document.getElementById('qrPreview');
  const savePNGButton = document.getElementById('savePNG');
  const saveSVGButton = document.getElementById('saveSVG');

  let qr = null;

  // Set default QR type to URL
  dataTypeSelect.value = 'url';
  updateInputFields();

  // Auto-fill URL from current tab
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    const inputData = document.getElementById('inputData');
    if (inputData) {
      inputData.value = currentUrl;
    }
  });

  dataTypeSelect.addEventListener('change', updateInputFields);

  function updateInputFields() {
    const dataType = dataTypeSelect.value;
    inputFields.textContent = ''; // Clear existing content safely
    
    const fragment = document.createDocumentFragment();
    
    const createInput = (type, id, placeholder) => {
      const input = document.createElement('input');
      input.type = type;
      input.id = id;
      input.placeholder = placeholder;
      return input;
    };
    
    switch (dataType) {
      case 'text':
        fragment.appendChild(createInput('text', 'inputData', 'Enter text'));
        break;
      case 'url':
        fragment.appendChild(createInput('url', 'inputData', 'Enter URL'));
        break;
      case 'email':
        fragment.appendChild(createInput('email', 'inputData', 'Enter email'));
        break;
      case 'phone':
        fragment.appendChild(createInput('tel', 'inputData', 'Enter phone number'));
        break;
      case 'wifi':
        fragment.appendChild(createInput('text', 'ssid', 'SSID'));
        fragment.appendChild(createInput('password', 'password', 'Password'));
        const select = document.createElement('select');
        select.id = 'encryption';
        ['WPA/WPA2', 'WEP', 'No Encryption'].forEach((option, index) => {
          const optionElement = document.createElement('option');
          optionElement.value = ['WPA', 'WEP', 'nopass'][index];
          optionElement.textContent = option;
          select.appendChild(optionElement);
        });
        fragment.appendChild(select);
        break;
      case 'contact':
        fragment.appendChild(createInput('text', 'name', 'Name'));
        fragment.appendChild(createInput('tel', 'phone', 'Phone'));
        fragment.appendChild(createInput('email', 'email', 'Email'));
        fragment.appendChild(createInput('text', 'address', 'Address'));
        break;
    }
    
    inputFields.appendChild(fragment);
    
    // If the data type is URL, try to auto-fill it
    if (dataType === 'url') {
      browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentUrl = tabs[0].url;
        const inputData = document.getElementById('inputData');
        if (inputData) {
          inputData.value = currentUrl;
        }
      });
    }
  }

  function validateInput(dataType) {
    const getValue = id => document.getElementById(id).value;
    switch(dataType) {
      case 'text':
        return getValue('inputData').trim() !== '';
      case 'url':
        return /^(https?:\/\/)?([\w.-]+)(:\d+)?([\w\d\s\/\-._~:\/?#[\]@!$&'()*+,;=]*)$/.test(decodeURIComponent(getValue('inputData')));
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getValue('inputData'));
      case 'phone':
        return /^\+?[\d\s()-]{10,}$/.test(getValue('inputData'));
      case 'wifi':
        return getValue('ssid').trim() !== '' && (getValue('encryption') === 'nopass' || getValue('password').trim() !== '');
      case 'contact':
        return getValue('name').trim() !== '' && (getValue('phone').trim() !== '' || getValue('email').trim() !== '');
    }
  }

  function getQRData(dataType) {
    const getValue = id => document.getElementById(id).value;
    switch(dataType) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        return getValue('inputData');
      case 'wifi':
        return `WIFI:T:${getValue('encryption')};S:${getValue('ssid')};P:${getValue('password')};;`;
      case 'contact':
        return `BEGIN:VCARD
VERSION:3.0
FN:${getValue('name')}
TEL:${getValue('phone')}
EMAIL:${getValue('email')}
ADR:${getValue('address')}
END:VCARD`;
    }
  }

  generateButton.addEventListener('click', function() {
    const dataType = dataTypeSelect.value;
    if (!validateInput(dataType)) {
      errorMessage.textContent = 'Please enter valid data for the selected type.';
      qrPreview.style.display = 'none';
      return;
    }
    errorMessage.textContent = '';

    const qrData = getQRData(dataType);

    qrcodeDiv.textContent = ''; // Clear existing content safely
    qr = qrcode(0, 'M');
    qr.addData(qrData);
    qr.make();
    
    const qrImage = new Image();
    qrImage.src = qr.createDataURL(5);
    qrImage.alt = 'QR Code';
    qrcodeDiv.appendChild(qrImage);

    qrPreview.style.display = 'block';
  });

  savePNGButton.addEventListener('click', function() {
    if (!qr) return;
    const svgString = qr.createSvgTag(5);
    
    browser.runtime.sendMessage({
      action: "savePNG",
      svgString: svgString
    }).then(response => {
      if (response.success) {
        console.log("PNG saved successfully");
      } else {
        console.error("Failed to save PNG:", response.error);
      }
    }).catch(error => {
      console.error("Error in savePNG:", error);
    });
  });

  saveSVGButton.addEventListener('click', function() {
    if (!qr) return;
    const svgString = qr.createSvgTag(3);
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    browser.downloads.download({
      url: url,
      filename: 'qrcode.svg'
    });
  });

  updateInputFields();
});