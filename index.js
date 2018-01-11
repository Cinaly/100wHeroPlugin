require('shelljs/global');
var AipOcrClient   = require("baidu-aip-sdk").ocr;
var request        = require('request');
var cheerio        = require('cheerio');
var fs             = require('fs');
var APP_ID         = 10672764;
var images         = require("images");
var API_KEY        = "2e4o0q4XCgPZFWPAkxBc2dQi";
var SECRET_KEY     = "Siz8xYL2MP52IPTd8DPVaNAX7C7TVg8k";
var client         = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);
const io           = require('socket.io-client');


var timestamp=new Date().getTime();
exec('adb shell /system/bin/screencap -p /sdcard/'+timestamp+'.png && adb pull /sdcard/'+timestamp+'.png D:\\jietu\\images\\'+timestamp+'.png', function(code, stdout, stderr) {
	var imageBuffer    = new Buffer(fs.readFileSync('images/'+timestamp+'.png'));
	images(imageBuffer).draw(images("fugai.png"), 0, 0).resize(720, null).save("images\\build\\"+timestamp+".png",{quality: 30});
	var newImageBase64 = imageBuffer.length > 102400 ? images(imageBuffer).draw(images("fugai.png"), 0, 0).encode("png", { operation: 70 }).toString("base64") : imageBuffer.toString("base64");

	console.log('imageBuffer：'+imageBuffer.length, '---newImageBase64：'+newImageBase64.length);

	//// 调用通用文字识别, 图片参数为本地图片
	client.generalBasic(newImageBase64).then(function(result) {
		var imageTextObj = result.words_result;

		var newKey = '';
		
		var answer   = [];
		var question = [];
		
		for(item in imageTextObj){
			var index = parseInt(item);
			if(imageTextObj[index].words === '7777'){
				question = imageTextObj.slice(0,imageTextObj.length - 5);
				answer   = imageTextObj.slice(imageTextObj.length - 3,imageTextObj.length);
			}
		}
		
		for(item in question){
			newKey+=question[item].words;
		}
		
		var obj = {
			question: newKey,
			answer: answer
		}
		
//		console.log(obj);

		getSearchContent(obj);

	}).catch(function(err) {
		// 如果发生网络错误
		console.log(err);
		console.log('asdfsfd');
	});

});

// 把识别的关键字当key请求百度返回搜索结果
const getSearchContent = (obj) => {
	var socket = io.connect('http://localhost:3538');
	socket.on('connect', function (data) {
		socket.emit('sendKeyToServer', obj);
	});
	
	request('http://www.baidu.com/s?wd='+encodeURI(obj.question), function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(body);
			var str = '';
			for(item in $('.result.c-container')){
				if(parseInt(item) !== NaN && parseInt(item) < 20){
					str += $($('.result.c-container')[item]).text();
				}
			}
			
			var newArr = [];
			
			for(item in obj.answer){
				var value = obj.answer[item].words;
				var arr = str.split(value);
				newArr.push({item: value, count: arr.length - 1});
			}
			console.log('----------------------------------------------------------------------------------------');
			
			
			var newOBj = {
				title: obj.question,
				data: newArr
			}
			
			console.log(newOBj);
			
			socket.emit('sendKeyToServerAnswer', newOBj);
			
		}
	});
}



