// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require('electron');

const BRAND_CHROMIUM = 'Chromium';
const BRAND_CHROME = 'Chrome';

ipcRenderer.send('getConfigData');

function handleBrands(brands = []) {
  return brands.map((item) => ({
    ...item,
    brand: item.brand === BRAND_CHROMIUM ? BRAND_CHROME : item.brand,
  }));
};

ipcRenderer.on('configData', function (event, config) {
  const {
    userAgent,
    platform,
    lang,
  } = config || {};

  ipcRenderer.send('log', 'Using user agent: ' + userAgent);
  ipcRenderer.send('log', 'Platform: ' + platform);
  ipcRenderer.send('log', 'Lang: ' + lang);

  navigator.__defineGetter__('userAgent', function(){
    return userAgent;
  });

  navigator.__defineGetter__('language', function(){
    return lang;
  });

  navigator.__defineGetter__('languages', function(){
    return [lang];
  });

  navigator.__defineGetter__('platform', function(){
    return platform;
  });

  const originalUAData = Object.assign({}, navigator.userAgentData);
  const highEntropyValues = navigator.userAgentData.getHighEntropyValues([
    'architecture',
    'bitness',
    'model',
    'platformVersion',
    'uaFullVersion',
    'fullVersionList',
  ]).then((data) => (Promise.resolve({
    ...data,
    platform,
    brands: handleBrands(data?.brands || []),
    fullVersionList: handleBrands(data?.fullVersionList || []),
  })));

  highEntropyValues.then((data) => { ipcRenderer.send('log', 'High entropy values: ' + JSON.stringify(data)); });

  navigator.__defineGetter__('userAgentData', function() {
    return {
      ...originalUAData,
      getHighEntropyValues: () => (highEntropyValues),
      platform,
      brands: handleBrands(originalUAData.brands),
    };
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});

(function mockChromeUserAgent() {
  let oiginalVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.getVoices = function () {
    return [
      {
        voiceURI: "Google US English",
        name: "Google US English",
        lang: "en-US",
        localService: false,
        default: false,
      },
    ];
  };

  //wait some arbitraty time before cleaning up the mess we did previously
  setTimeout(() => {
    window.speechSynthesis.getVoices = function () {
      return oiginalVoices;
    };
  }, 10_000);
})();
