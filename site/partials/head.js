/* set the theme before first paint so there is no flash */
document.documentElement.classList.add('js');
(function(){try{var t=localStorage.getItem('theme');
if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();