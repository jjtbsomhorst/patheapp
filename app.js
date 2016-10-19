"use strict";
var https = require('https');
var currentCinemaId = null;
var currentCinemaName = null;

var defaultHeaders= {
	"X-Client-Token":Homey.env.AUTH_TOKEN
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
	if(currentCinemaId == null || currentCinemaName == null){
		Homey.log('No cinema selected');
		Homey.manager('speech-output').say(__('setupneeded'));
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
	

	Homey.manager('flow').on('action.pathe_tell_schedule',function(callback,args){
		Homey.log('Someone triggered me');
		onScheduleTrigger();
		callback(null,true);
	})
	Homey.log('Done init pathe app');

	
}

var onScheduleTrigger = function(){
	Homey.log('Start Schedule trigger');
	
	currentCinemaId = Homey.manager('settings').get('currentCinema');
	currentCinemaName = Homey.manager('settings').get('currentCinemaName');	
	
	if(currentCinemaId == null){
		Homey.manager('speech-output').say(__('setupneeded'));
		return;
	}


	var currentDate = new Date().toISOString();	
	Homey.log('Currentcinema '+JSON.stringify(currentCinemaId));
	Homey.manager('speech-output').say(__('loadingmessage'));
	var options = defaultOptions;
	options.path = '/v1/cinemas/schedules?date='+currentDate.substr(0,10)+'&ids='+currentCinemaId.id;
		
	https.get(options,function(res){
		var body = '';
		res.on('data',function(chunk){
			body += chunk;	
		}).on('end',function(){
			Homey.log("Done retrieving schedule from server");
			onGetScheduleSuccess(JSON.parse(body));
		});
	}).on('error',function(error){
		Homey.log('error retrieving schedule');
	});
	
	
}

var onGetScheduleSuccess = function(data){
	Homey.log('Succesfully retrieved schedule');
	Homey.log(data);
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
	
	if(schedule.movies.length == 0){
		Homey.manager('speech-output').say(__("nomoviesscheduled",{"cinema":currentCinemaName}));
		
		return true;
	}
	
	Homey.manager('speech-output').say(__("movieschedulestart",{"cinema":currentCinemaName}));
	
	movies.forEach(function(value,key,map){
		
		var schedule = value[0];
		var time = schedule.start;
		var dateTimeArray = time.split("T");
		var time = dateTimeArray[1].substr(0,5);
		Homey.manager('speech-output').say(__("moviescheduleline",{"moviename": key.name,"movietime":time}));
		
	});
}

module.exports.init = init;
