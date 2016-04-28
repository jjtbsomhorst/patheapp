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
	Homey.log('Start Schedule trigger');
	
	var currentDate = new Date().toISOString();
	var schedule = loadSchedule();

	
	if(schedule == null){
		var options = defaultOptions;
	options.path = '/v1/cinemas/schedules?date='+currentDate.substr(0,10)+'&ids='+currentCinemaId;
		
	https.get(options,function(res){
		var body = '';
		res.on('data',function(chunk){
			body += chunk;	
		}).on('end',function(){
			Homey.log("Done retrieving schedule from server");
			saveSchedule(body);
			onGetScheduleSuccess(JSON.parse(body));
		});
	}).on('error',function(error){
		Homey.log('error retrieving schedule');
	});
	}else{
		onGetScheduleSuccess(schedule);
		
	}
	
}

var saveSchedule = function(schedule){
	Homey.log('Saving schedule');
	var currentDate = new Date().toISOString();
	var jsonSchedule = JSON.parse(schedule);
	Homey.log('Set retrieval date to schedule');
	jsonSchedule.retrieveDate = currentDate;
	Homey.log('Persist Schedule');
	Homey.manager('settings').set('currentSchedule',JSON.stringify(jsonSchedule));
}

var loadSchedule = function(){
	Homey.log('Loading schedule from storage');
	var currentDate = new Date();
	var schedule = Homey.manager('settings').get('currentSchedule');
	if(schedule != null){
		Homey.log('Schedule found. Check age of schedule');
		var jsonSchedule = JSON.parse(schedule);
		var scheduleRetrieveDate = new Date(jsonSchedule.retrieveDate);
		var diff = currentDate.getTime() - scheduleRetrieveDate.getTime();
		if(diff < 900000){
			Homey.log('Schedule still valid');
			return jsonSchedule;
		}
	}
	Homey.log('No schedule found or expired. Reset schedule');
	Homey.manager('settings').set('currentSchedule',null);
	return null;
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
	
	Homey.manager('speech-output').say(
		__("movieschedulestart",{"cinema":currentCinemaName}));
	
	movies.forEach(function(value,key,map){
		
		var schedule = value[0];
		var time = schedule.start;
		var dateTimeArray = time.split("T");
		var time = dateTimeArray[1].substr(0,5);
		Homey.manager('speech-output').say(__("moviescheduleline",{"moviename": key.name,"movietime":time}));
		
	});
	
}

module.exports.init = init;
