"use strict";
var K = {
      load: function(){
		var   callbackStack = []
			, urlStack = []
			, interval = 200; 		// interval in ms how frequently we check for completion of ressource loading
		K.args(arguments).forEach(function(arg){//allows many arguments, that even can be arrays of urls (or callback functions)
			if(typeof arg==="function"){
				callbackStack.push(arg);
			}else if(typeof arg==="string" && arg.indexOf(".")!=-1){
                var url = arg;
				urlStack.push({url:url,status:"requested"});
				var urlStackIndex = urlStack.length-1;
				switch(url.substring(url.lastIndexOf(".")+1)){
					case "css":
						var css = document.createElement('link');
						css.rel = "stylesheet";
						css.type = "text/css";
						css.href = url;
						css.onload = function(){ urlStack[urlStackIndex].status = "loaded"; };	//TODO does FF 4+ support this?
						css.onerror = function(){ urlStack[urlStackIndex].status = "failed"; };
						(document.head || document.getElementsByTagName('head')[0]).appendChild(css);
						break;
					case "js": //alternative that even google uses: document.write('<script src="' + url + '" type="text/javascript"></script>');
						var js = document.createElement("script");
						js.type = "text/javascript";
						js.async = true;
						js.src = url;
						js.onload = function(){ urlStack[urlStackIndex].status = "loaded"; };
						js.onerror = function(){ urlStack[urlStackIndex].status = "failed"; };
						(document.head || document.getElementsByTagName('head')[0]).appendChild(js);
						break;
					case "jpg":	//fallthrough for all image types
					case "png":
					case "gif":
					case "jpeg":
					case "bmp":
						var img = new Image();
						img.onload = function(){ urlStack[urlStackIndex].status = "loaded"; };
						img.onerror = function(){ urlStack[urlStackIndex].status = "failed"; };
						img.src = url;
						break;
					default:
						//nop
						break;
				}//end switch between ressource types
			}//end if argument is a ressource url
		});//end for each flattened arguments
		var c = setInterval(function() { 
			if( urlStack.every(function(o){ return o.status == "loaded"; }) ){ // if all ressources are loaded, call all functions in callbackStack
				clearInterval(c);
				callbackStack.forEach(function(fn){ fn.call(); });
				return true;
			}
			if( urlStack.some(function(o){ return o.status == "failed"; }) ){ // if some urls are aborted, throw an error
				clearInterval(c);
				throw new Error("K.load failed. The following urls couldn't be loaded: "+urlStack.filter(function(o){return o.status == "failed"; }).join(", ") );
			}
		}, interval);
		
	}
	, isDescriptor: function(o,type){
		if(typeof o!="object"){ return false; }
		var DataDescriptorDefinition = [
			 {name:"value", optional:false}
			,{name:"writable",optional:true,type:"boolean"}
			,{name:"enumerable",optional:true,type:"boolean"}
			,{name:"configurable",optional:true,type:"boolean"}
		];
		var AccessorDescriptorDefinition = [
			 {name:"get",optional:true,type:"function"}
			,{name:"set",optional:true,type:"function"}
			,{name:"enumerable",optional:true,type:"boolean"}
			,{name:"configurable",optional:true,type:"boolean"}
		];
		return ( (!type || type=="data") ? check(DataDescriptorDefinition) : true )			//check for DataDescriptor if definitiontype is "data" or if no definition specified
			|| ( (!type || type=="accessor") ? check(AccessorDescriptorDefinition) : true );	//check for AccessorDescriptor if definitiontype is "accessor" or if no definition specified
		
		function check(definition){
			return Object.keys(o).every(function(key){ return definition.map(function(d){ return d.name; }).indexOf(key)!=-1 })	//no other properties
				&& definition.every(function(d){ //for all propertydefinitions
					if(d.optional==false && !o[d.name]){ return false; } //they are present if not optional
					if(!!o[d.name] && !!d.type && typeof o[d.name]!==d.type){ return false; } //they have the right type (if set)
					return true;
				});
		}
	}
	, args: function(argumentsObject,start){ return K.flatten(Array.prototype.slice.call(argumentsObject,start||0)); }
	//, flatten: function(a){ return a.reduce(function(prev,el){ return prev.concat(Object.isArray(el) ? K.flatten(el) : el);}); }
	, flatten: function(a){var r=[],a0;while(a.length){a0=a.shift();if(a0 instanceof Array){a=a0.concat(a);}else{r.push(a0);}}return r;}
	// 800x(!) schneller in Chrome 13, 22x schneller in FF5 als die reduce methode! siehe http://jsperf.com/flatten-an-array/2
	, isDefined : function(o){ return o!==null && o!== undefined; }
	, createId : function(i){	
		var s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",sl=s.length;
		return s[ 0 | Math.random()*sl ] + (i==1 ? "" : k.createId( (i||8) -1) ); // 0| is aequivalent but faster than Math.floor()
	}
	, merge : function (to,from,dontOverwrite){
		for(var name in from){if(from.hasOwnProperty(key)){ //faster than  Object.keys(from).forEach(function(name){}); ...
			if(!dontOverwrite || !K.isDefined(to[name])){
				to[name] = from[name];
			}
		}}
		return to;
	}
	, extend: function(o){//allows objects and arrays of objects to be mixed into o. Supports dontOverwrite flags with simple keyword strings
		var dontOverwrite = false;
		K.args(arguments,1).forEach(function(arg){
			switch (arg){
				case "dontOverwrite":	dontOverwrite = true; break;
				case "overwrite":		dontOverwrite = false; break;	
				default:				K.merge(o,arg,dontOverwrite); break;
			}
		});
		return o;
	}
};

//Inspired by http://uxebu.com/blog/2011/02/23/object-based-inheritance-for-ecmascript-5/
//TODO have a look at https://gist.github.com/1008904  for implementation and testcases
K.Base = {
	  subclass: function(){
		var properties = {};
		[{_base:this}].concat(K.args(arguments)).forEach(function(arg){//forEach flattened arguments, damit können Arrays als Mixins übergeben werde
			if(!K.isDefined(arg)){ return; }
			Object.keys(arg).forEach(function(key){
				var val = arg[key];
				properties[key] = K.isDescriptor(val) ? val : { value:val, writable:true, enumerable:true, configurable:true };//convert simple property val to propertyDescriptor of val
															 //Object.getOwnPropertyDescriptor(o, key); // I don't get it, are default values really true? The ECMA specs say it is "false"!
				if(typeof properties[key].value=="function" && typeof this[key]=="function"){
					var _base = this;//this ist in diesem Context die SuperClass oder BaseClass
					properties[key].value = function(){ //wrap function to provide access to base method via this._base
						var temp = this._base;
						this._base = _base[key]; 
						var result = val.apply(this,arguments); 
						this._base = temp;
						return result;
					}; 
					//TODO necessary? There is already this._base existing, so I could always call this._base._init.apply(this,arguments) anstatt this._base().apply(this,arguments)
				}
			},this);
		},this);
		return Object.create(this,properties);
	}
	, create: function(){
		var o = Object.create(this);
		Object.defineProperties(o,{
			  _setupArguments:	{value:Array.slice(arguments),writable:true,configurable:false}
			, _base:			{value:this,writable:true,configurable:false}
		});
		if(o._init){ o._init.apply(o,arguments); }
		return o;
	}
	, _init: function(){return this;}
	, extend: function(){
		K.args(arguments).forEach(function(arg){
			if(K.isDefined(arg)){ K.merge(this,arg); }
		},this);
		return this;
	}
};