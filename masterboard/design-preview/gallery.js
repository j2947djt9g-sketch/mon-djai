'use strict';
let screen='accounts';
for(const button of document.querySelectorAll('[data-screen]'))button.addEventListener('click',()=>{
 screen=button.dataset.screen;
 for(const item of document.querySelectorAll('[data-screen]'))item.setAttribute('aria-pressed',String(item===button));
 for(const frame of document.querySelectorAll('iframe'))frame.contentWindow.postMessage({type:'masterboard-design-screen',screen},location.origin);
});
for(const button of document.querySelectorAll('[data-style]'))button.addEventListener('click',()=>{
 for(const item of document.querySelectorAll('[data-style]'))item.setAttribute('aria-pressed',String(item===button));
 for(const proposal of document.querySelectorAll('[data-proposal]'))proposal.classList.toggle('selected',proposal.dataset.proposal===button.dataset.style);
});
for(const frame of document.querySelectorAll('iframe'))frame.addEventListener('load',()=>frame.contentWindow.postMessage({type:'masterboard-design-screen',screen},location.origin));
