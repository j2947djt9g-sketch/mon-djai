// Exercise the visible illustrated picker; retain native fallback coverage when enhancement is absent.
async function chooseCategory(page,select,value){
 await select.waitFor({state:'attached'});
 await select.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
 const host=select.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " category-picker-host ")][1]');
 if(await host.count()){
  const details=host.locator('details.category-picker');
  if(!await details.evaluate(node=>node.open))await host.locator('.category-picker-trigger').click();
  await host.locator('.category-picker-option[data-category-value="'+String(value).replace(/["\\]/g,'\\$&')+'"]').click();
 }else await select.selectOption(value);
}
module.exports={chooseCategory};
