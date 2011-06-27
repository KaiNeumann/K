"use strict";
K.Date = K.Base.subclass({
      DAYS_IN_MONTH :		[31,28,31,30,31,30,31,31,30,31,30,31]
	, UNITS : 				["Millisecond","Second","Minute","Hour","Day","Week","Month","Year"]
	, Baseunit :			"Day"
	, SUNDAY :				0
	, MONDAY :				1
	, TUESDAY :				2
	, WEDNESDAY :			3
	, THURSDAY :			4
	, FRIDAY :				5
	, SATURDAY :			6
	, getDaysInMonth : 		function(month,year){ return month==1 ? (K.Date.isLeapYear(year) ? 29 : 28) : K.Date.DAYS_IN_MONTH[month]; }
	, isLeapYear : 			function(year){ return (year%4==0) && (year%100!=0 || year%400==0); }
	, _init:function(d){
		var _date = null;
		var _originalDay = null;

		K.merge(this,{
			  clone: 				function(){ return this.create(new Date(_date)); }
			, getDaysInMonth : 		function(){ return K.Date.getDaysInMonth(this.getMonth(),this.getFullYear()); }
			, isLeapYear : 			function(){ return K.Date.isLeapYear(this.getFullYear()); }
			, isWeekend : 			function(){ var day=this.getDay(); return day==K.Date.SATURDAY || day==K.Date.SUNDAY; }
			, isToday :				function(){ var t=K.Date.create("today"); return this.getFullYear()==t.getFullYear() && this.getMonth()==t.getMonth() && this.getDate()==t.getDate(); }
			, toArray : 			function(){ return [this.getFullYear(),this.getMonth(),this.getDate(),this.getHours(),this.getMinutes(),this.getSeconds()]; }
			, increaseMillisecond:	function(i){ _date.setTime(		this.getTime()		+ (i||1) );		return this; }
			, increaseSecond : 		function(i){ _date.setSeconds(	this.getSeconds()	+ (i||1) );		return this; }
			, increaseMinute : 		function(i){ _date.setMinutes(	this.getMinutes()	+ (i||1) ); 	return this; }
			, increaseHour : 		function(i){ _date.setHours(	this.getHours()		+ (i||1) ); 	return this; }
			, increaseDay : 		function(i){ _date.setDate(		this.getDate()		+ (i||1) ); 	return this; }
			, increaseWeek : 		function(i){ _date.setDate(		this.getDate()		+ (i||1)*7 ); 	return this; }
			, increaseMonth : 		function(i){ 
				_date.setDate(1);												//set to first day in month to avoid overflow
				_date.setMonth( this.getMonth()	+ (i||1) );						//set correct monht
				_date.setDate(Math.min(_originalDay,this.getDaysInMonth()));	//correct day in month 
				return this; 
			}
			, increaseYear : 		function(i){ 
				_date.setDate(1);
				_date.setFullYear( this.getFullYear() + (i||1) );
				_date.setDate(Math.min(_originalDay,this.getDaysInMonth()));
				return this; 
			}
			, decreaseMillisecond:	function(i){ return this.increaseMillisecond(0-i||-1); }
			, decreaseSecond : 		function(i){ return this.increaseSecond(	0-i||-1); }
			, decreaseMinute : 		function(i){ return this.increaseMinute(	0-i||-1); }
			, decreaseHour : 		function(i){ return this.increaseHour(		0-i||-1); }
			, decreaseDay : 		function(i){ return this.increaseDay(		0-i||-1); }
			, decreaseWeek : 		function(i){ return this.increaseWeek(		0-i||-1); }
			, decreaseMonth : 		function(i){ return this.increaseMonth(		0-i||-1); }
			, decreaseYear : 		function(i){ return this.increaseYear(		0-i||-1); }
			, increase :			function(i,unit){ return this["increase"+(unit||K.Date.Baseunit)](i||1); }
			, decrease :			function(i,unit){ return this["decrease"+(unit||K.Date.Baseunit)](i||1); }
			, setToMonthEnd : 		function(){ _date.setDate(this.getDaysInMonth()); return this; }
			, setToMonthBegin : 	function(){ _date.setDate(1); return this;}
			, nextWorkingDay :		function(){ this.increaseDay(); while (this.isWeekend()){ this.increaseDay(); } return this; }
			, nextWeekend :			function(){ this.increaseDay(); while (!this.isWeekend()){ this.increaseDay(); } return this; }
			, nextWeekDay :			function(day){ this.increaseDay(); while (this.getDay()!=day){ this.increaseDay(); } return this; }	
			, daysDifferenceTo :	function(d){ return Math.floor( ((new Date()).getTime() - (new Date(d)).getTime() ) / (1000*60*60*24) ); }
		});
		//hijack original Date methods and reroute them to _date:
		var disallowed = ["constructor"]; 
		Object.getOwnPropertyNames(Date.prototype).forEach(function(method){ 
			if(disallowed.indexOf(method)==-1 && (typeof Date.prototype[method]=="function")){ 
				this[method] = function(){ var r = _date[method].apply(_date,arguments); return r instanceof Date ? this: r; }; 
			}
		},this);
		
		var now = new Date();
		switch(arguments.length){
			case 0:						_date = now; break//no argument = now
			case 1:
				if(typeof d == "string"){ switch(d){
					case "now":			_date = now; break;
					case "today":		_date = new Date(now.getFullYear(), now.getMonth(), now.getDate()  ); break;
					case "tomorrow":	_date = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1); break;
					case "yesterday":	_date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1); break;
					default: 			_date = new Date(d); break; //string with a date to parse
				}} 
				else if (K.Date.isPrototypeOf(d)){ 			_date = new Date(d.toString()); } 
				else if (Date.prototype.isPrototypeOf(d)){	_date = d; 	} //oder d instanceof Date
				break;
			default: //year,month,day,hour,minute,second
				_date = new Date(arguments[0] || null, arguments[1] || null, arguments[2] || null, arguments[3] || null
								,arguments[4] || null, arguments[5] || null, arguments[6] || null);
				break;
		}
		_originalDay = this.getDate();
		
		return this;
	}
});
