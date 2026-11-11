/* Pure hint from the device's explicit configured region. No position lookup. */
(function(root){
  'use strict';
  const regions=Object.freeze(Object.assign(
    Object.fromEntries(['AT','BE','BG','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK','AD','MC','ME','SM','VA','XK'].map(region=>[region,'EUR'])),
    Object.fromEntries(['BJ','BF','CI','GW','ML','NE','SN','TG'].map(region=>[region,'XOF'])),
    Object.fromEntries(['CM','CF','TD','CG','GQ','GA'].map(region=>[region,'XAF'])),
    {US:'USD',GB:'GBP',MA:'MAD',CA:'CAD',CH:'CHF',LI:'CHF'}
  ));
  function suggest(locales,supportedCodes){
    const supported=new Set(Array.isArray(supportedCodes)?supportedCodes:[]);
    const preferences=typeof locales==='string'?[locales]:Array.isArray(locales)?locales:[];
    for(const locale of preferences){
      if(typeof locale!=='string'||!locale.trim())continue;
      let region;try{region=new Intl.Locale(locale).region;}catch{continue;}
      const code=regions[region];if(code&&supported.has(code))return code;
    }
    return null;
  }
  root.ClairRegionCurrency=Object.freeze({suggest});
})(typeof window!=='undefined'?window:globalThis);
