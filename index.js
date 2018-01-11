require('shelljs/global');
const AipOcrClient   = require("baidu-aip-sdk").ocr;
const request        = require('request');
const cheerio        = require('cheerio');
const fs             = require('fs');
const images         = require("images");
const timestamp      = new Date().getTime();
const socket         = require('socket.io-client').connect('http://localhost:3538');

// 把识别的关键字当key请求百度返回搜索结果
const getSearchContent = (obj) => {
	
	request('http://www.baidu.com/s?wd='+encodeURI(obj.question), (error, response, body) => {
		if (!error && response.statusCode === 200) {
			var $ = cheerio.load(body);
			var str = '';
			for(item in $('.result.c-container')){
				if(parseInt(item) !== NaN && parseInt(item) < 20){
					str += $($('.result.c-container')[item]).text();
				}
			}
			
			const newArr = [];
			
			for(item in obj.answer){
				const value = obj.answer[item].words;
				const arr = str.split(value);
				newArr.push({item: value, count: arr.length - 1});
			}
			
			const newOBj = {
				title: obj.question,
				data: newArr
			}
			
			socket.emit('sendKeyToServer', obj);
			socket.emit('sendKeyToServerAnswer', newOBj);
			
		}
	});
}

// 根据图片识别文字
const getImageText = () => {
	const imageBuffer    = new Buffer(fs.readFileSync('images/'+timestamp+'.png'));
	const newImageBase64 = imageBuffer.length > 102400 ? images(imageBuffer).draw(images("mask.png"), 0, 0).encode("png", { operation: 70 }).toString("base64") : imageBuffer.toString("base64");
	images(imageBuffer).draw(images("mask.png"), 0, 0).resize(720, null).save("images\\build\\"+timestamp+".png",{quality: 30});
	
	console.log('imageBuffer：'+imageBuffer.length, '---newImageBase64：'+newImageBase64.length);
	
	const APP_ID         = 10672764;
	const API_KEY        = "2e4o0q4XCgPZFWPAkxBc2dQi";
	const SECRET_KEY     = "Siz8xYL2MP52IPTd8DPVaNAX7C7TVg8k";
	const client         = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);
	
	//// 调用通用文字识别, 图片参数为本地图片
	client.generalBasic(newImageBase64).then((result) => {
		const imageTextObj = result.words_result;
		
		let newKey   = '';
		let answer   = [];
		let question = [];
		
		// 从源数据格式化出问题与答案
		for(item in imageTextObj){
			const index = parseInt(item);
			if(imageTextObj[index].words === '7777'){
				question = imageTextObj.slice(0,imageTextObj.length - 5);
				answer   = imageTextObj.slice(imageTextObj.length - 3,imageTextObj.length);
			}
		}
		
		// 生成标题
		for(item in question){
			newKey += question[item].words;
		}
		
		var obj = {
			question: newKey,
			answer: answer
		}
		
		getSearchContent(obj);
		
	}).catch(function(err) {
		// 如果发生网络错误
		console.log(err);
	});
}

exec('adb shell /system/bin/screencap -p /sdcard/'+timestamp+'.png && adb pull /sdcard/'+timestamp+'.png D:\\jietu\\images\\'+timestamp+'.png', (code, stdout, stderr) => {
	getImageText();
});



