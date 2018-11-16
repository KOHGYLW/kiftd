/*!
 * jQuery Viewer v1.0.0
 * https://github.com/fengyuanchen/jquery-viewer
 *
 * Copyright (c) 2018 Chen Fengyuan
 * Released under the MIT license
 *
 * Date: 2018-04-01T05:58:29.617Z
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(require("jquery"),require("viewerjs")):"function"==typeof define&&define.amd?define(["jquery","viewerjs"],t):t(e.jQuery,e.Viewer)}(this,function(d,v){"use strict";if(d=d&&d.hasOwnProperty("default")?d.default:d,v=v&&v.hasOwnProperty("default")?v.default:v,d.fn){var e=d.fn.viewer,c="viewer";d.fn.viewer=function(o){for(var e=arguments.length,u=Array(1<e?e-1:0),t=1;t<e;t++)u[t-1]=arguments[t];var s=void 0;return this.each(function(e,t){var r=d(t),i="destroy"===o,n=r.data(c);if(!n){if(i)return;var f=d.extend({},r.data(),d.isPlainObject(o)&&o);n=new v(t,f),r.data(c,n)}if("string"==typeof o){var a=n[o];d.isFunction(a)&&((s=a.apply(n,u))===n&&(s=void 0),i&&r.removeData(c))}}),void 0!==s?s:this},d.fn.viewer.Constructor=v,d.fn.viewer.setDefaults=v.setDefaults,d.fn.viewer.noConflict=function(){return d.fn.viewer=e,this}}});