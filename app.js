"use strict";
var https = require('https');
var currentCinemaId = null;
var currentCinemaName = null;

var defaultHeaders= {
			"X-Client-Token":"145d9cc482614938b61f33e02f49accc"
}


var defaultOptions = {
	host: "connect.pathe.nl",
	headers: defaultHeaders,
	path: ''
}

function init() {
	Homey.log('Init Pathe app');
	currentCinemaId = Homey.manager('settings').get('currentCinema');
	currentCinemaName = Homey.manager('settings').get('currentCinemaName');	
	Homey.log(currentCinemaId);
	Homey.log(currentCinemaName);
	if(currentCinemaId == null || currentCinemaName == null){
		Homey.log('No cinema selected');
		Homey.manager('speech-output').say('U dient een bioscoop te selecteren in de configuratie');
		return false;
	}
	Homey.log('Listening');
	Homey.manager('speech-input').on('speech',function(speech,callback){
		speech.triggers.some(function(trigger){
			switch(trigger.id){
				case 'search_movies_today':
					Homey.log('Search movie schedule');
					onScheduleTrigger();
					return true;
			}
		});
	});
	


	Homey.log('Done init pathe app');

	
}

var onScheduleTrigger = function(){
	var options = defaultOptions;
	var currentDate = new Date().toISOString();
	
	options.path = '/v1/cinemas/schedules?date='+currentDate.substr(0,10)+'&ids='+currentCinemaId;
	Homey.log(options.path);
	
	https.get(options,function(res){
		var body = '';
		res.on('data',function(chunk){
			body += chunk;	
		}).on('end',function(){
			Homey.log(body);
			onGetScheduleSuccess(JSON.parse(body));
		});
	}).on('error',function(error){
		Homey.log('error retrieving schedule');
	});
	
}



var onGetScheduleSuccess = function(data){
	Homey.log('Succesfully retrieved schedule');
	var schedule =data;
	var movies = new Map();
	schedule.movies.forEach(function(movie){
		var movietimes = [];
		
		schedule.schedules.forEach(function(entry){
			if(entry.movieId == movie.id){
				movietimes.push(entry);
			}
		});

		movies.set(movie,movietimes);
	});
	
	Homey.manager('speech-output').say('Bij '+currentCinemaName+' draaien de volgende films');
	
	movies.forEach(function(value,key,map){
		
		var schedule = value[0];
		var time = schedule.start;
		var dateTimeArray = time.split("T");
		var time = dateTimeArray[1].substr(0,5);
		
		
		var outputString = key.name+" draait om "+time;
		
		Homey.manager('speech-output').say(outputString);
		
	});
	
}

module.exports.init = init;
