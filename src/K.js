(function(window,undefined) { //in case somebody has redefined window or undefined...

"use strict";
var K = {
      about: {
          version:      "0.17"
        , author:       "Kai Uwe Neumann"
        , url:          "https://github.com/KaiNeumann/K"
        , copyright:    "(c) 2006-2011"
        , license:      "http://creativecommons.org/licenses/by-nc-sa/3.0/"
        , encoding:     "8-bit"
        , indent:       "4 Spaces, useTabs"
    }
    
    
    //Ressource loader K.require
    
    , loadedUrls: []        //Cache of already loaded urls.
    , requirements: {}
    , NamespacePaths: {}    //Cache of known paths to namespaces
    //Namespaces have to be defined in an own js file, because it's absolute path will be used for loading requirements of same namespace
    //Namespace root files have to be included directly in the header in own script tags
    , require: function(/*arguments: urlstrings or functions*/){
        var id = K.createId();
        var req = K.requirements[id] = {};
        var callbackStack =     []
            , hasCallbacks =    K.args(arguments).some(function(arg){return typeof arg==="function";}) //use to determine if we load scripts asynchronously or not
            , interval =        99          // interval in ms how frequently we check for completion of ressource loading
            , maxIntervals =    200;        // max number of intervals to wait for ressources to load, just to avoid endless waiting
        K.args(arguments).forEach(function(arg){    //allows many arguments, that even can be arrays of urls (or callback functions)
            if(typeof arg==="function"){
                callbackStack.push(arg);
            }else if(typeof arg==="string" && arg.indexOf(".")!==-1){ //any string with "." in it is considered to be an url candidate
                var url = toAbsolutePath(arg);
                if(req[url] || K.loadedUrls.indexOf(url)>-1){ return; } //check if url already in own stack or loaded elsewhere
                req[url] = "requested";
                K.loadedUrls.push( url );
                switch(url.substring(url.lastIndexOf(".")+1)){
                    case "css":
                        var css =       document.createElement('link');
                        css.rel =       "stylesheet";
                        css.type =      "text/css";
                        css.href =      url;
                        req[url]="loaded"; //FIXME as long as onload and onerror are not supported in Chrome and Firefox, I consider them to be successfully loaded anyway. Let's see how far I can get with this...
                        (document.head || document.getElementsByTagName('head')[0]).appendChild(css);
                        break;
                    case "js":
                        var js =        document.createElement("script");
                        js.type =       "text/javascript";
                        js.async =      !hasCallbacks; // async = true if no Callbacks, async = false (synchronous) if there are callback functions
                        js.onload =     function(){ req[url] = "loaded"; }; //addEventListener(js, 'load', function() { req[url] =  = "loaded"; });
                        js.onerror =    function(){ req[url] = "failed"; };
                        js.src =        url;
                        (document.body || document.getElementsByTagName('body')[0]).appendChild(js); //when adding to head, sometimes the onload event is not triggered (chrome 13)
                        break;
                    case "jpg": //fallthrough for preload of all image types
                    case "png":
                    case "gif":
                    case "jpeg":
                    case "bmp":
                        var img =       new Image();
                        img.src =       url;
                        req[url]="loaded"; //TO REVIEW image preloading is immediately considered successful
                        break;
                    default:
                        throw new Error("require failed on unknown ressource type "+url);
                    break;
                }//end switch between ressource types
            } else {
                throw new Error("require failed as argument is no url: "+url);
            }
        });//end for each flattened arguments
        var intervals = 0;
        if(Object.keys(req).length==0 && callbackStack.length==0){ return true; } //everything already cached, or no requirement given and no callbacks defined
        var c = setInterval(function() { 
            if(Object.keys(req).every(function(key){ return req[key]=="loaded"; }) ){
                clearInterval(c);
                //console.log("K.require succeeded after waiting "+intervals+" intervals à "+interval+" ms. urls: "+JSON.stringify(req)+". Ready to call "+callbackStack.length+" callback functions." );
                callbackStack.forEach(function(fn,i){ 
                    //console.log("  calling callback function #"+i);
                    fn(); 
                    //console.log("    success");
                });
                return true;
            } else if( intervals >= maxIntervals || Object.keys(req).some(function(key){ return key == "failed"; }) ){ // if timeout or some urls are aborted, throw an error
                clearInterval(c);
                throw new Error("K.require failed after waiting "+intervals+" intervals à "+interval+" ms. Current urlStack: "+JSON.stringify(req));
            }
            //else just wait another interval
            intervals++;
        }, interval);
        //console.log("require set up for "+callbackStack.length+" callbacks, and the following urls: "+JSON.stringify(req) );
        return true;
        
        function toAbsolutePath(url){ //adds a relative url to it's absolute path, eliminating "/./" and "/parent/../ "
            url = url.replace(/\/\.\\/g,"/");   //just for sanity reasons
            url = getNamespacePath(url)+url;    //add absolute base url for base namespace
            //FIXME: if we dont have an absolute path but a relative one, starting with ../ or ../../ this function will fail!
            // e.g fails on   "../file.js", "../../file.js" and urls that resolve to those two patterns like "test/parent/../../../../file.js"
            var r = /([^\/]*\/\.\.\/)/;         //resolve relative url part to acces parent folders
            while(r.test(url)){ 
                url = url.replace(url.match(r)[1],""); 
            }
            return url;
        }
        function getNamespacePath(url){ 
            var namespace = url.substring(0,url.indexOf("."));                                   //Namespace is the first part of a uri, e.g. for Test.Base.js namespace is Test
            if(K.NamespacePaths[namespace]){ return K.NamespacePaths[namespace]; }              //quick path if namespace path already cached
            var url_pattern = new RegExp("^(.*)"+ namespace +"\.js$");                           //Look for root js file of namespace,e.g. Test.js
            var aScriptNodes = document.getElementsByTagName("script");
            for(var i=0;i<aScriptNodes.length;i++){                                             //look in loaded scripts for namespaces
                if(aScriptNodes[i].src && url_pattern.test(aScriptNodes[i].src)){ 
                    K.NamespacePaths[namespace] = url_pattern.exec(aScriptNodes[i].src)[1]; //cache namespace path
                    return K.NamespacePaths[namespace];
                }
            }
            throw new Error("getNamespacePath found no match for url: "+url);
        }
    }
    
    
    // Array and Arguments related helper functions
    
    , args: function(argumentsObject,start){ return K.flatten(Array.prototype.slice.call(argumentsObject,start||0)); }
    // 1600x(!) schneller in Chrome 12, 250x schneller in FF6 als die reduce methode! siehe http://jsperf.com/flatten-an-array/3
    , flatten: function(a){for(var i=0,l=a.length,c;i<l;i++){c=a[i];if(toString.call(c)==='[object Array]'){l+=c.length-1;splice.apply(a,[i, 1].concat(c));i--;}}return a;}
    //, flatten: function(a){var r=[],a0;while(a.length){a0=a.shift();if(a0 instanceof Array){a=a0.concat(a);}else{r.push(a0);}}return r;}
    //, flatten: function(a){ return a.reduce(function(prev,el){ return prev.concat(Object.isArray(el) ? K.flatten(el) : el);}); }
    , clone: function(a){return [].concat(a);}
    
    
    // Object related helper functions
    
    , isDefined: function(o){ return o!==null && o!== undefined; }
    , merge: function (to,from,dontOverwrite){
        for(var name in from){if(from.hasOwnProperty(name)){ //faster than  Object.keys(from).forEach(function(name){}); ...
            if(!dontOverwrite || !K.isDefined(to[name])){
                to[name] = from[name];
            }
        }}
        return to;
    }
    , extend: function(o/*,arguments*/){//allows objects and arrays of objects to be mixed into o. Supports dontOverwrite flags with simple keyword strings
        var dontOverwrite = false;
        K.args(arguments,1).forEach(function(arg){
            if(!K.isDefined(arg)){ return; }
            switch (arg){
                case "dontOverwrite":   dontOverwrite = true;               break;
                case "overwrite":       dontOverwrite = false;              break;
                default:                K.merge(o, arg, dontOverwrite);    break;
            }
        });
        return o;
    }
    
    
    // String related helper functions
    
    , multimatch: function(s,regexps){
        var match;
        for(var name in regexps){ if(regexps.hasOwnProperty(name)){
            match = s.match(regexps[name]);
            //if(!!match && match.some(function(el){return !!el;}) ) return {name:name,found:match};
            if(!!match && match.length>0 ) return {name:name,found:match};
        }}
        return {name:null,found:null};
    }
    , repeat: function(s,i){ return new Array(i).join(s); }
    , tabs : function (i){ return K.repeat("\t",i); }
    , createId: function(i){
        var s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",sl=s.length;
        return s[ 0 | Math.random()*sl ] + (i==1 ? "" : K.createId( (i||8) -1) ); // 0| is aequivalent but faster than Math.floor()
    }
    
    
    // Number related helper functions
    
    , toPercent: function(nr,scale,precision){ return nr*(!!scale?100:1 ).toPrecision(precision || 4)+"% "; }
    , sign: function(nr){ return nr > 0 ? 1 : (nr < 0 ? -1 : 0); }
    
    
    // DOM related helper functions
    
    , createElement: function(name/*,arguments*/){ //see Ksl.Dom.0.15.3.1.js
        var domObj = document.createElement(name);
        for( var i=1; i<arguments.length; i++ ){ _create(domObj,arguments[i]); }
        return domObj;

        function _create(parent,el){
            if( !K.isDefined(el) ){ return; }
            if( typeof el==="string" ){ parent.appendChild( document.createTextNode( el ) ); } 
            else if( el.nodeType && el.nodeType == Node.ELEMENT_NODE ){ parent.appendChild( el ); } 
            else if( el.nodeType && el.nodeType == Node.ATTRIBUTE_NODE ){ parent.setAttributeNode( el ); } 
            else if( el.forEach ){
                for(var i=0,len=el.length;i<len;i++){
                    _create(parent,el[i]);
                }
            }
            else if( toString.call(el)==="[object Object]" ){ 
                for(var name in el){if( el.hasOwnProperty(name) ){
                    if( typeof el[name]==="function" ){
                        if( name.indexOf("on")===0 ){ parent[name] = el[name];
                        } else { parent.addEventListener(name, el[name], false); }
                    } else { parent.setAttribute(name,el[name]); }
                }}
            }
        }
    }
    , createAttribute : function(name,value){ var o = document.createAttribute(name) ; o.nodeValue = value; return o; }
    , clearElement: function(el){
        if(typeof el==="string"){ el = document.getElementById(el); }
        //while(el.firstChild){ el.removeChild( el.firstChild );
        el.innerHTML="";    //keeps Attributes of the element (such as style id etc)
        return el;
    }
    
    // Base for Class system
    // Inspired by http://uxebu.com/blog/2011/02/23/object-based-inheritance-for-ecmascript-5/
    // TODO have a look at https://gist.github.com/1008904  for implementation and testcases
    , Base: {
        subclass: function(/*arguments*/){
            var properties = {};
            [{_base:this}].concat(K.args(arguments)).forEach(function(arg){//forEach flattened arguments, so whole arrays of objects can be mixed in
                if(!K.isDefined(arg)){ return; }
                Object.keys(arg).forEach(function(key){
                    var val = arg[key];
                    properties[key] = isDescriptor(val) ? val : { value:val, writable:true, enumerable:true, configurable:true };//convert simple property val to propertyDescriptor of val
                    //or rather Object.getOwnPropertyDescriptor(o, key)? // I don't get it, are default values really "true"? The ECMA specs say it is "false"!
                    if(typeof properties[key].value==="function" && typeof this[key]==="function"){
                        var _that = this;//this ist in diesem Context die SuperClass oder BaseClass
                        properties[key].value = function(){ //wrap function to provide access to base method via this._base
                            var temp = this._base;
                            this._base = _that[key]; 
                            var result = val.apply(this,arguments); 
                            this._base = temp;
                            return result;
                        }; 
                        //TODO necessary? There is already this._base existing, so I could always call this.constructor._base._init.apply(this,arguments) instead of this._base.apply(this,arguments)
                    }
                },this);
            },this);
            return Object.create(this,properties);
            
            function isDescriptor(o,type){
                if(typeof o!=="object"){ return false; }
                var DataDescriptorDefinition = [
                      { name: "value",          optional: false                     }
                    , { name: "writable",       optional: true,     type: "boolean" }
                    , { name: "enumerable",     optional: true,     type: "boolean" }
                    , { name: "configurable",   optional: true,     type: "boolean" }
                ];
                var AccessorDescriptorDefinition = [
                      { name: "get",            optional: true,     type: "function" }
                    , { name: "set",            optional: true,     type: "function" }
                    , { name: "enumerable",     optional: true,     type: "boolean" }
                    , { name: "configurable",   optional: true,     type: "boolean" }
                ];
                return ( (!type || type==="data") ? check(DataDescriptorDefinition) : true )            //check for DataDescriptor if definitiontype is "data" or if no definition specified
                    || ( (!type || type==="accessor") ? check(AccessorDescriptorDefinition) : true );   //check for AccessorDescriptor if definitiontype is "accessor" or if no definition specified

                function check(definition){
                    return Object.keys(o).every(function(key){ return definition.map(function(d){ return d.name; }).indexOf(key)!=-1; })	//no other properties in definition
                            && definition.every(function(d){                                                   //and for every propertydefinition check if they
                                if(d.optional===false && !o[d.name]){ return false; }                         //  * are present if mandatory
                                if(!!o[d.name] && !!d.type && typeof o[d.name]!==d.type){ return false; }   //  * have the right type (if set)
                                return true;
                            });
                }
            }
        }
        , create: function(/*arguments*/){//create Instance
            var o = Object.create(this);
            Object.defineProperties(o,{
                  _setupArguments:  {value: Array.prototype.slice.call(arguments), writable: true, configurable: false}
                , constructor:      {value: this, writable: true, configurable: false}
            });
            if(!!o._init){ o._init.apply(o,arguments); }
            return o;
        }
        , _init: function(){return this;}//base init function for instances. Will most likely be overwritten for each class
        , extend: function(/*arguments*/){ return K.extend(this,arguments); }
    }
};

})(this);